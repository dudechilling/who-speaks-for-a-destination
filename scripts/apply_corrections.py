#!/usr/bin/env python3
"""Apply documented metadata corrections to source_index.csv (sweep 4).

Input: a JSON list of corrections, each based on evidence in the document itself:
  {"source_id", "action": "set" | "date" | "bot_check_page" | "content_duplicate", ...}
- set: replace the listed fields; evidence is appended to date_evidence when given;
  note is appended to availability_notes. Earlier title/type are kept in the note.
- date: set publication_year/publication_date, date_status = verified_in_document,
  append evidence to date_evidence.
- bot_check_page: status ACCESS_RESTRICTED; the stored file moves to
  superseded_local_files (with SHA-256); local_file/sha256/file_type are cleared.
- content_duplicate: duplicate_of and status DUPLICATE; the file is kept.
source_id, include and selection_notes are never changed. Holds the index lock.

Usage: python3 -I scripts/apply_corrections.py CORRECTIONS.json
"""
import fcntl
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import collect  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROTECTED = {"source_id", "include", "selection_notes", "local_file", "sha256"}


def main():
    lockf = open(os.path.join(ROOT, "corpus", "originals", ".source_index.lock"), "w")
    try:
        fcntl.flock(lockf, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        sys.exit("another process holds the source index lock")
    rows = collect.load_index(ROOT)
    by_id = {r["source_id"]: r for r in rows}
    done = []
    for c in json.load(open(sys.argv[1], encoding="utf-8")):
        r = by_id.get(c["source_id"])
        if not r:
            print("unknown", c["source_id"])
            continue
        a = c["action"]
        if a == "set":
            old = f"Earlier values: title '{r['document_title']}', type '{r['document_type']}'."
            for k, v in c.get("fields", {}).items():
                if k not in PROTECTED:
                    r[k] = v
            if c.get("note"):
                r["availability_notes"] = (r["availability_notes"] + " " + c["note"] + " " + old).strip()
        elif a == "date":
            r["publication_year"], r["publication_date"] = c["year"], c["date"]
            r["date_status"] = "verified_in_document"
        elif a == "bot_check_page":
            r["superseded_local_files"] = " | ".join(x for x in [
                r.get("superseded_local_files"),
                f"{r['local_file']} (sha256 {r['sha256']}, {r['file_size_bytes']} bytes; bot-check page)"] if x)
            r["local_file"] = r["sha256"] = r["file_type"] = r["file_size_bytes"] = ""
            r["acquisition_status"] = "ACCESS_RESTRICTED"
            r["availability_notes"] = (r["availability_notes"] + " " + c["note"]).strip()
        elif a == "content_duplicate":
            r["duplicate_of"] = c["duplicate_of"]
            r["acquisition_status"] = "DUPLICATE"
            r["availability_notes"] = (r["availability_notes"] + " " + c["note"]).strip()
        if c.get("evidence"):
            r["date_evidence"] = (r["date_evidence"] + " | " + c["evidence"]).strip(" |")
        done.append(c["source_id"])
    collect.write_index(ROOT, rows)
    print(json.dumps({"applied": len(done)}))


if __name__ == "__main__":
    main()
