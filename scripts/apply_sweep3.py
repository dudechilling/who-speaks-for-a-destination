#!/usr/bin/env python3
"""Apply sweep-3 review results to the canonical records (CMNS3500-P3-DISCOVERY-02).

Inputs: .discovery_state/sweep3/<PREFIX>_dates.jsonl, <PREFIX>_authors.jsonl.
Every agent claim is checked against the extracted document text before it is applied:
- a date quote must occur in corpus/derived/text or corpus/derived/ocr for that source
  (whitespace- and case-insensitive); otherwise the claim is not applied and the row is
  marked date_status = "agent_claim_not_confirmed";
- a printed title must occur in the text; otherwise it is ignored;
- an author name must occur in the text of its source_id (all name parts of 3+ letters).

Index changes (source_index.csv):
- date_status is set; date_evidence is APPENDED ("Sweep 3: ..."), never replaced;
- verified_in_document   -> year/date set from the document (blank fields only, or equal);
- conflicts_with_index   -> year/date replaced by the documented value; the earlier value
                            and its basis stay in date_evidence; date_status = corrected_from_document;
- uncertain              -> values unchanged; date_status = uncertain;
- not_found              -> values unchanged; date_status = listing_only_not_confirmed when the
                            row has a year from a listing/filename, else not_found_in_document;
- printed title          -> document_title replaced only when title_basis is not "printed";
                            the earlier title is kept in availability_notes; title_basis = printed (sweep 3).
source_id, include and selection_notes are never changed.

authors.csv: verified new name occurrences are appended with new name_ids. Existing rows
are not changed. Run make_public_authors.py afterwards.

Usage: python3 -I scripts/apply_sweep3.py [--dry-run]
"""
import argparse
import collections
import csv
import glob
import json
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import collect  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S3 = os.path.join(ROOT, ".discovery_state", "sweep3")
O = os.path.join(ROOT, "corpus", "originals")
_cache = {}


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").lower()
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    return re.sub(r"[^a-z0-9]+", "", s)


def text_of(sid):
    if sid not in _cache:
        t = ""
        for p in (os.path.join(ROOT, "corpus", "derived", "text", sid + ".txt"),
                  os.path.join(ROOT, "corpus", "derived", "ocr", sid + ".txt")):
            if os.path.exists(p):
                t += open(p, encoding="utf-8", errors="replace").read()
        _cache[sid] = norm(t)
    return _cache[sid]


def quotes(evidence):
    return [q for q in re.findall(r'"([^"]{4,})"', evidence or "")]


def confirmed(sid, evidence):
    qs = quotes(evidence)
    if not qs:
        return False
    t = text_of(sid)
    return all(norm(q) and norm(q) in t for q in qs)


LABEL = ["Sweep 3"]


def load(prefix_glob):
    out = []
    for p in sorted(glob.glob(os.path.join(S3, prefix_glob))):
        for i, l in enumerate(open(p, encoding="utf-8")):
            if l.strip():
                try:
                    out.append(json.loads(l))
                except json.JSONDecodeError:
                    print(f"bad json {os.path.basename(p)}:{i + 1}", file=sys.stderr)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--dir", default=S3, help="directory with the review outputs (default sweep 3)")
    ap.add_argument("--label", default="Sweep 3", help="label used in appended evidence")
    a = ap.parse_args()
    globals()["S3"] = a.dir
    LABEL[0] = a.label
    rows = collect.load_index(ROOT)
    by_id = {r["source_id"]: r for r in rows}
    st = collections.Counter()
    seen = set()
    for d in load("*_dates.jsonl"):
        sid = d.get("source_id")
        r = by_id.get(sid)
        if not r or sid in seen:
            st["skipped_unknown_or_repeat"] += 1
            continue
        seen.add(sid)
        status = d.get("date_status", "")
        ev = (d.get("evidence") or "").strip()
        y, dt_ = (d.get("publication_year") or "").strip(), (d.get("publication_date") or "").strip()
        kind = d.get("date_kind", "")
        note = (d.get("note") or "").strip()
        ok = confirmed(sid, ev)
        if status == "conflicts_with_index" and not y:
            status = "uncertain"  # a correction needs a documented value
        weak_index = bool(r["publication_year"]) and \
            bool(re.search(r"filename|file name|link text|\burl\b|listing|slug|path", r["date_evidence"], re.I))
        if status in ("verified_in_document", "conflicts_with_index") and not ok and \
                re.search(r"page image|\.png|image", ev + " " + note, re.I):
            r["date_status"] = "read_from_page_image_needs_confirmation"
            r["date_evidence"] = (r["date_evidence"] + f" | {LABEL[0]}: an agent read {y or '-'} / "
                                  f"{dt_ or '-'} ({kind}) from a page image: {ev}; not machine-"
                                  "confirmed and not applied; needs human confirmation.").strip(" |")
            st["image_reading_not_applied"] += 1
            continue
        if status in ("verified_in_document", "conflicts_with_index") and not ok:
            r["date_status"] = "agent_claim_not_confirmed"
            r["date_evidence"] = (r["date_evidence"] + f" | {LABEL[0]}: an agent proposed {y or dt_} "
                                  f"({kind}) but the quoted evidence was not found in the extracted "
                                  "text; not applied.").strip(" |")
            st["not_confirmed"] += 1
            continue
        if status == "verified_in_document":
            if r["publication_year"] and y and r["publication_year"] != y:
                status = "conflicts_with_index"  # treat as a correction below
            else:
                if y:
                    r["publication_year"] = y
                if dt_ and not r["publication_date"]:
                    r["publication_date"] = dt_
                r["date_status"] = "verified_in_document"
                r["date_evidence"] = (r["date_evidence"] + f" | {LABEL[0]} (in document, {kind}): {ev}"
                                      + (f"; {note}" if note else "")).strip(" |")
                st["verified"] += 1
        if status == "conflicts_with_index":
            old = f"{r['publication_year'] or '-'} / {r['publication_date'] or '-'}"
            r["publication_year"], r["publication_date"] = y, dt_
            r["date_status"] = "corrected_from_document"
            r["date_evidence"] = (r["date_evidence"] + f" | {LABEL[0]} correction (in document, {kind}): "
                                  f"{ev}; earlier index value {old} came from the basis above"
                                  + (f"; {note}" if note else "")).strip(" |")
            st["corrected"] += 1
        elif status == "uncertain":
            r["date_status"] = "uncertain"
            r["date_evidence"] = (r["date_evidence"] + f" | {LABEL[0]} (uncertain): {ev or '-'}"
                                  + (f"; {note}" if note else "")).strip(" |")
            st["uncertain"] += 1
        elif status == "not_found":
            r["date_status"] = "listing_only_not_confirmed" if weak_index else "not_found_in_document"
            if note:
                r["date_evidence"] = (r["date_evidence"] + f" | {LABEL[0]}: no date in document; {note}").strip(" |")
            st[r["date_status"]] += 1
        pt = (d.get("printed_title") or "").strip()
        if pt and not r["title_basis"].startswith("printed") and norm(pt) and norm(pt) in text_of(sid):
            r["availability_notes"] = (r["availability_notes"] + f" Earlier title (from "
                                       f"{r['title_basis'] or 'listing'}): {r['document_title']}.").strip()
            r["document_title"] = pt
            r["title_basis"] = "printed (sweep 3)"
            st["titles_from_document"] += 1
    # authors
    ap_path = os.path.join(O, "authors.csv")
    with open(ap_path, newline="", encoding="utf-8") as f:
        rd = csv.DictReader(f)
        fields = rd.fieldnames
        authors = list(rd)
    nmax = max(int(x["name_id"][1:]) for x in authors)
    have = {(x["recorded_name"], x["source_id"], x["name_type"]) for x in authors}
    new = []
    for x in load("*_authors.jsonl"):
        sid, nm = x.get("source_id"), (x.get("recorded_name") or "").strip()
        if sid not in by_id or not nm or (nm, sid, x.get("name_type")) in have:
            st["authors_skipped"] += 1
            continue
        parts = [norm(p) for p in nm.split() if len(norm(p)) > 2]
        if not parts or not all(p in text_of(sid) for p in parts):
            st["authors_not_in_text"] += 1
            continue
        nmax += 1
        row = {k: (x.get(k) if not isinstance(x.get(k), list) else " ; ".join(x.get(k))) or ""
               for k in fields}
        row["name_id"] = f"N{nmax:04d}"
        row["evidence_note"] = (row["evidence_note"] + f" [{LABEL[0].lower()}, DISCOVERY-02]").strip()
        new.append(row)
        have.add((nm, sid, x.get("name_type")))
    st["authors_added"] = len(new)
    print(json.dumps(st, indent=1))
    if a.dry_run:
        return
    collect.write_index(ROOT, rows)
    tmp = ap_path + ".tmp"
    with open(tmp, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields, quoting=csv.QUOTE_ALL)
        w.writeheader()
        w.writerows(authors + new)
    os.replace(tmp, ap_path)


if __name__ == "__main__":
    main()
