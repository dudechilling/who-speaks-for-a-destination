#!/usr/bin/env python3
"""Build review packets for sweep 3 (CMNS3500-P3-DISCOVERY-02).

For each selected downloaded row, a packet entry holds: the index metadata, the first
non-empty lines of page 1, lines that contain a year (1950-2026) or a month name, and
lines with role keywords (chair, president, CEO, executive director, prepared by...),
each with its page number. Text comes from corpus/derived/text (pdftotext / HTML text)
or corpus/derived/ocr (selective OCR) when the PDF has no text layer.

Packets contain source text. They are written to .discovery_state/sweep3/packets/
(local only, never published).

Selection:
  --dates  rows without publication_year, and rows whose date_evidence cites only a
           filename, link text, URL or listing;
  --names  rows downloaded in DISCOVERY-02 (from acquisition_log.jsonl) whose
           source_id has no entry in authors.csv.

Usage: python3 -I scripts/build_review_packets.py --dates --names
"""
import argparse
import collections
import csv
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
O = os.path.join(ROOT, "corpus", "originals")
YEAR = re.compile(r"\b(19[5-9]\d|20[0-2]\d)\b")
MONTH = re.compile(r"\b(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|"
                   r"sep(t|tember)?|oct(ober)?|nov(ember)?|dec(ember)?)\b", re.I)
ROLE = re.compile(r"\b(chair(person|man|woman)?|vice[- ]chair|president|chief executive|ceo|"
                  r"executive director|general manager|managing director|prepared by|"
                  r"written by|compiled by|edited by|editor|message from|respectfully submitted|"
                  r"sincerely|on behalf of the board)\b", re.I)
WEAK = re.compile(r"filename|file name|link text|\burl\b|listing|slug|path", re.I)


def text_for(sid):
    for p in (os.path.join(ROOT, "corpus", "derived", "ocr", sid + ".txt"),
              os.path.join(ROOT, "corpus", "derived", "text", sid + ".txt")):
        if os.path.exists(p):
            t = open(p, encoding="utf-8", errors="replace").read()
            if len(re.sub(r"\s", "", t)) >= 50 or "ocr" in p:
                return t, ("ocr" if "/ocr/" in p else "text")
    return "", ""


def entry(r, want_dates, want_names, max_pages=6):
    t, kind = text_for(r["source_id"])
    pages = t.split("\f")
    head = [l.strip()[:160] for l in pages[0].splitlines() if l.strip()][:25] if pages else []
    dl, rl = [], []
    for i, pg in enumerate(pages[:max_pages] if want_dates else pages, 1):
        for l in pg.splitlines():
            s = l.strip()
            if not s:
                continue
            if want_dates and i <= max_pages and (YEAR.search(s) or (MONTH.search(s) and len(s) < 80)):
                dl.append(f"[p.{i}] {s[:180]}")
            if want_names and ROLE.search(s):
                rl.append(f"[p.{i}] {s[:200]}")
    dl = list(dict.fromkeys(dl))[:20]
    rl = list(dict.fromkeys(rl))[:25]
    meta = (f"### {r['source_id']}\n"
            f"title: {r['document_title']} | type: {r['document_type']} | org: {r['organization']}\n"
            f"index year: {r['publication_year'] or '(none)'} | index date: {r['publication_date'] or '(none)'}"
            f" | date_evidence: {r['date_evidence'][:200] or '(none)'}\n"
            f"archive capture date (NOT a publication date): {r['archive_capture_date'] or '(none)'}"
            f" | url: {r['original_url'][:160]}\n"
            f"text source: {kind or 'none'} | file: {r['local_file']}")
    parts = [meta]
    if want_dates:
        parts.append("page-1 head:\n" + ("\n".join(head) or "(no text)"))
        parts.append("date lines:\n" + ("\n".join(dl) or "(none)"))
    if want_names:
        parts.append("role lines:\n" + ("\n".join(rl) or "(none)"))
    return "\n".join(parts)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dates", action="store_true")
    ap.add_argument("--names", action="store_true")
    ap.add_argument("--out", default=os.path.join(ROOT, ".discovery_state", "sweep3", "packets"))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    rows = list(csv.DictReader(open(os.path.join(O, "source_index.csv"), encoding="utf-8")))
    dl = [r for r in rows if r["acquisition_status"] == "DOWNLOADED"]
    summary = {}
    if a.dates:
        sel = [r for r in dl if not r["publication_year"] or WEAK.search(r["date_evidence"])]
        by = collections.defaultdict(list)
        for r in sel:
            by[r["region"]].append(r)
        for reg, rs in by.items():
            for k in range(0, len(rs), 120):  # chunks of 120 entries
                p = os.path.join(a.out, f"dates_{reg}_{k // 120 + 1:02d}.md")
                with open(p, "w", encoding="utf-8") as f:
                    f.write("\n\n".join(entry(r, True, False) for r in rs[k:k + 120]))
                summary[os.path.basename(p)] = len(rs[k:k + 120])
    if a.names:
        stored = set()
        for l in open(os.path.join(O, "acquisition_log.jsonl"), encoding="utf-8"):
            if l.strip():
                e = json.loads(l)
                if e.get("op") == "stored":
                    stored.add(e["source_id"])
        have = {x["source_id"] for x in csv.DictReader(open(os.path.join(O, "authors.csv"),
                                                              encoding="utf-8"))}
        sel = [r for r in dl if r["source_id"] in stored and r["source_id"] not in have]
        by = collections.defaultdict(list)
        for r in sel:
            e = entry(r, False, True)
            if "role lines:\n(none)" not in e:
                by[r["region"]].append(e)
        for reg, es in by.items():
            p = os.path.join(a.out, f"names_{reg}.md")
            with open(p, "w", encoding="utf-8") as f:
                f.write("\n\n".join(es))
            summary[os.path.basename(p)] = len(es)
    print(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main()
