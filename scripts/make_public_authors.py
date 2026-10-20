#!/usr/bin/env python3
"""Regenerate corpus/originals/authors_public.csv from the canonical authors.csv.

The canonical authors.csv stays local (it quotes contact details from documents).
The public copy is identical except that email addresses and phone numbers in any
cell are replaced with "[contact details removed]". Names, roles, source IDs,
page references and the rest of each evidence note are kept.

Usage: python3 -I scripts/make_public_authors.py
"""
import csv
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EMAIL = r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
PHONE = r"(?:\+?1[-. ]?)?\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b(?:,? ?ext\.? ?\d+)?"
CONTACT = re.compile(f"(?:E: ?|T: ?|Tel:? ?|Phone:? ?)?(?:{EMAIL}|{PHONE})")


def main():
    src = os.path.join(ROOT, "corpus", "originals", "authors.csv")
    dst = os.path.join(ROOT, "corpus", "originals", "authors_public.csv")
    with open(src, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fields = reader.fieldnames
        rows = list(reader)
    changed = 0
    for r in rows:
        new = {k: CONTACT.sub("[contact details removed]", v or "") for k, v in r.items()}
        if new != r:
            changed += 1
            r.update(new)
    tmp = dst + ".tmp"
    with open(tmp, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields, quoting=csv.QUOTE_ALL)
        w.writeheader()
        w.writerows(rows)
    os.replace(tmp, dst)
    print(f"{len(rows)} rows; {changed} rows redacted -> {dst}")


if __name__ == "__main__":
    main()
