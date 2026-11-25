"""Prepare reviewable clause-boundary suggestions, never analytical codes.

Run with spaCy 3.8.x, en_core_web_sm 3.8.0 and openpyxl 3.1.x:
    python scripts/propose_clause_boundaries.py RDMO_about_coding_review.xlsx OUTPUT.xlsx

Offsets are JavaScript UTF-16 code-unit offsets into the trimmed, unchanged
source block. Suggestions are not findings; researcher review is required.
Existing Clauses sheets are not overwritten.
"""
import argparse
from collections import Counter
from pathlib import Path
import re
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
import spacy

FIELDS = ["process_type", "process", "participants", "voice",
          "institutional_priority", "represented_beneficiary"]
HEADERS = ["clause_id", "source_id", "block_id", "start_offset", "end_offset",
           "clause_text", "block_fingerprint", *FIELDS, "process_start",
           "process_end", "coding_provenance", "coding_review_status",
           "coding_review_note", "boundary_provenance", "boundary_review_status"]
CLAUSAL = {"ROOT", "advcl", "ccomp", "xcomp", "relcl", "acl", "csubj",
           "csubjpass", "pcomp", "conj", "parataxis"}
VERBAL = {"VERB", "AUX"}
BREAKABLE = {"advcl", "relcl", "acl", "conj", "parataxis"}
PUNCT = {",", ";", ":", "–", "—", "-", ".", "!", "?", "(", ")", '"', "“", "”", "‘", "’"}

def js_len(s):
    return len(s.encode("utf-16-le")) // 2

def fingerprint(s):
    raw = s.encode("utf-16-le")
    a, b = 2166136261, 0x9e3779b9
    for i in range(0, len(raw), 2):
        x = raw[i] | raw[i+1] << 8
        a = ((a ^ x) * 16777619) & 0xffffffff
        b = ((b ^ x) * 2246822519) & 0xffffffff
    return f"{len(raw)//2}-{a:x}-{b:x}"

def predicate(t):
    if t.dep_ not in CLAUSAL:
        return False
    if t.pos_ not in VERBAL and not any(c.dep_ == "cop" for c in t.children):
        return False
    if t.dep_ == "conj" and t.head.pos_ not in VERBAL and not any(
        c.dep_ in {"nsubj", "nsubjpass", "aux", "cop", "dobj", "attr", "xcomp"} for c in t.children
    ):
        return False
    return True

def trim_tokens(doc, a, b):
    while a < b and (doc[a].is_space or doc[a].text in PUNCT or doc[a].dep_ == "cc"):
        a += 1
    while b > a and (doc[b-1].is_space or doc[b-1].text in PUNCT or doc[b-1].dep_ == "cc"):
        b -= 1
    return a, b

def spans(doc):
    result = set()
    for sent in doc.sents:
        preds = [t for t in sent if predicate(t)]
        for t in preds:
            a, b = max(sent.start, t.left_edge.i), min(sent.end, t.right_edge.i + 1)
            # Keep embedded or essential complements in the enclosing span;
            # split separable leading/trailing dependent and coordinated clauses.
            # Overlapping suggestions remain separately selectable in the list.
            for child in sorted(t.children, key=lambda c: c.i):
                if not predicate(child):
                    continue
                ca, cb = child.left_edge.i, child.right_edge.i + 1
                if child.dep_ not in BREAKABLE:
                    # A dash/semicolon sometimes parses an independent clause as
                    # a complement. Treat it as separable only with punctuation.
                    if child.dep_ != "ccomp" or not (
                        (cb < t.i and any(x.text in {"–", "—", ";"} for x in doc[cb:t.i]))
                        or (ca > t.i and ca > a and doc[ca-1].text in {"–", "—", ";"})
                    ):
                        continue
                if cb <= t.i and all(x.is_punct or x.is_space for x in doc[a:ca]):
                    a = cb
                elif ca > t.i and all(x.is_punct or x.is_space or x.dep_ == "cc" for x in doc[cb:b]):
                    # Do not cut through a nominal phrase: e.g. "members who
                    # operate businesses" may be essential to its description.
                    b = ca
            a, b = trim_tokens(doc, a, b)
            if a >= b or not a <= t.i < b:
                continue
            # Avoid isolated, parser-misidentified words; allow clear imperatives
            # and meaningful infinitives in list items.
            if b-a == 1 and (t.pos_ == "AUX" or t.tag_ in {"VBG", "VBN"}):
                continue
            start, end = doc[a].idx, doc[b-1].idx + len(doc[b-1].text)
            if start < end:
                result.add((start, end))
    return sorted(result)

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("source", type=Path)
    ap.add_argument("output", type=Path)
    args = ap.parse_args()
    assert args.source.resolve() != args.output.resolve(), "Preserve original workbook."
    wb = openpyxl.load_workbook(args.source)
    assert "Clauses" not in wb.sheetnames, "Existing annotations must not be overwritten."
    nlp = spacy.load("en_core_web_sm", disable=["ner"])
    inputs = []
    for sh in wb:
        if not sh.title.startswith("SRC_"):
            continue
        values = iter(sh.values)
        cols = next(values)
        for row in values:
            r = dict(zip(cols, row))
            t = str(r.get("corrected_text") or r.get("original_text") or "").strip()
            if r.get("block_kind") in {"paragraph", "list_item", "lead"} and t:
                inputs.append((r, t))
    sh = wb.create_sheet("Clauses")
    sh.append(HEADERS)
    counts, nonclauses = Counter(), Counter()
    total = 0
    for (r, t), parsed in zip(inputs, nlp.pipe((t for _, t in inputs), batch_size=32), strict=True):
        proposals = spans(parsed)
        if not proposals:
            nonclauses[r["source_id"]] += 1
        for a, b in proposals:
            start, end = js_len(t[:a]), js_len(t[:b])
            values = {
                "clause_id": f"{r['block_id']}:{start}:{end}",
                "source_id": r["source_id"], "block_id": r["block_id"],
                "start_offset": start, "end_offset": end, "clause_text": t[a:b],
                "block_fingerprint": fingerprint(t),
                "coding_review_status": "suggested",
                "boundary_provenance": "machine_proposed",
                "boundary_review_status": "unreviewed",
            }
            sh.append([values.get(h) for h in HEADERS])
            counts[r["source_id"]] += 1
            total += 1
    sh.freeze_panes = "G2"
    sh.auto_filter.ref = sh.dimensions
    for cell in sh[1]:
        cell.fill = PatternFill("solid", fgColor="345E40")
        cell.font = Font(name="Calibri", bold=True, color="FFFFFF")
        cell.alignment = Alignment(wrap_text=True, vertical="center")
    sh.row_dimensions[1].height = 30
    for i,h in enumerate(HEADERS,1):
        sh.column_dimensions[get_column_letter(i)].width = {
            "clause_text": 84, "clause_id": 42, "block_fingerprint": 29,
            "participants": 42, "coding_review_note": 40,
        }.get(h, max(18, min(32, len(h)+3)))
    for row in sh.iter_rows(min_row=2):
        row[5].alignment = Alignment(wrap_text=True, vertical="top")
        sh.row_dimensions[row[0].row].height = min(84, 15 * max(1, (len(row[5].value)+75)//76))
        for c in row[7:13]:
            c.font = Font(name="Calibri", color="244E9B")
    wb.save(args.output)
    print(f"{total} boundary suggestions, {len(inputs)} non-heading source blocks, {len(counts)} pages.")
    for source in sorted(counts):
        print(source, counts[source], "uncandidate blocks:", nonclauses[source])

if __name__ == "__main__":
    main()