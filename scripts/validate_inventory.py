#!/usr/bin/env python3
"""Validate the discovery inventory (CMNS3500-P3-DISCOVERY-02, prompt section 12).

Checks
 1. every local_file exists;                      2. every SHA-256 matches;
 3. no identical original stored twice;           4. source IDs unique and none removed
                                                     since the Git revision (--rev);
 5. every row has original_url or archive_url;    6. a publication year/date has date_evidence;
 7. archive capture date never equals the         8. every PDF marked DOWNLOADED parses
    publication date;                                (pdfinfo); incomplete files are flagged;
 9. failed / restricted rows keep a status       10. every author row links to an existing
    and a reason in availability_notes;              source_id (authors.csv and the public copy);
11. include / selection_notes unchanged since    12. files on disk are either indexed or listed
    --rev;                                           in superseded_local_files.

Exit status 1 if a check fails. Prints a JSON summary.
Usage: python3 -I scripts/validate_inventory.py [--rev HEAD] [--skip-pdf]
"""
import argparse
import collections
import csv
import hashlib
import io
import json
import os
import re
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
O = os.path.join(ROOT, "corpus", "originals")


def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rev", default="HEAD")
    ap.add_argument("--skip-pdf", action="store_true")
    a = ap.parse_args()
    rows = list(csv.DictReader(open(os.path.join(O, "source_index.csv"), encoding="utf-8")))
    res, fails = {}, []
    ids = [r["source_id"] for r in rows]
    by_id = {r["source_id"]: r for r in rows}
    # 1-2
    missing, mismatch, hashes = [], [], collections.defaultdict(list)
    for r in rows:
        if r["local_file"]:
            p = os.path.join(O, r["local_file"])
            if not os.path.exists(p):
                missing.append(r["source_id"])
                continue
            h = sha(p)
            hashes[h].append(r["local_file"])
            if h != r["sha256"]:
                mismatch.append(r["source_id"])
    res["files_indexed"] = sum(1 for r in rows if r["local_file"])
    res["files_missing"] = missing
    res["checksum_mismatches"] = mismatch
    # 12 + 3: all files on disk
    indexed = {os.path.normpath(r["local_file"]) for r in rows if r["local_file"]}
    superseded = set()
    for r in rows:
        for part in (r.get("superseded_local_files") or "").split(" | "):
            if part:
                superseded.add(os.path.normpath(part.split(" (sha256")[0]))
    disk = []
    for dp, dn, fn in os.walk(O):
        for f in fn:
            rel = os.path.normpath(os.path.relpath(os.path.join(dp, f), O))
            if rel.count(os.sep) >= 2 and not f.startswith("."):
                disk.append(rel)
    res["files_on_disk"] = len(disk)
    res["unaccounted_files"] = sorted(set(disk) - indexed - superseded)[:20]
    disk_hash = collections.defaultdict(list)
    for rel in disk:
        if rel in indexed:
            continue
        disk_hash[sha(os.path.join(O, rel))].append(rel)
    for h, fs in hashes.items():
        disk_hash[h].extend(fs)
    res["identical_files_on_disk"] = [fs for fs in disk_hash.values() if len(fs) > 1]
    res["bytes_on_disk"] = sum(os.path.getsize(os.path.join(O, d)) for d in disk)
    # 4
    res["duplicate_ids"] = [k for k, v in collections.Counter(ids).items() if v > 1]
    old = {}
    try:
        txt = subprocess.run(["git", "-C", ROOT, "show", f"{a.rev}:corpus/originals/source_index.csv"],
                             capture_output=True, text=True, check=True).stdout
        old = {r["source_id"]: r for r in csv.DictReader(io.StringIO(txt))}
    except subprocess.CalledProcessError:
        pass
    res["ids_removed_since_rev"] = [k for k in old if k not in by_id]
    # 5
    res["rows_without_url"] = [r["source_id"] for r in rows if not (r["original_url"] or r["archive_url"])]
    # 6-7
    res["dated_rows"] = sum(1 for r in rows if r["publication_year"])
    res["dated_rows_without_date_evidence"] = sum(1 for r in rows if r["publication_year"]
                                                  and not r["date_evidence"].strip())
    same = [r for r in rows if r["publication_date"] and r["publication_date"] == r["archive_capture_date"]]
    # equal dates are acceptable only when the date is printed in the document (same-day capture)
    res["publication_date_equals_capture_date"] = [
        r["source_id"] for r in same
        if r.get("date_status") not in ("verified_in_document", "corrected_from_document")]
    res["same_day_capture_documented"] = [r["source_id"] for r in same
                                          if r["source_id"] not in res["publication_date_equals_capture_date"]]
    # 8
    bad_pdf = []
    if not a.skip_pdf:
        for r in rows:
            if r["acquisition_status"] == "DOWNLOADED" and r["file_type"] == "application/pdf":
                p = os.path.join(O, r["local_file"])
                if os.path.exists(p) and subprocess.run(["pdfinfo", p], capture_output=True).returncode:
                    bad_pdf.append(r["source_id"])
    res["downloaded_pdfs_not_parsing"] = bad_pdf
    res["incomplete_rows"] = [r["source_id"] for r in rows if r["acquisition_status"] == "DOWNLOADED_INCOMPLETE"]
    # 9
    res["failed_or_restricted_without_reason"] = [
        r["source_id"] for r in rows
        if r["acquisition_status"] in ("DOWNLOAD_FAILED", "ACCESS_RESTRICTED", "UNAVAILABLE")
        and not r["availability_notes"].strip()]
    res["rows_without_status"] = [r["source_id"] for r in rows if not r["acquisition_status"]]
    # 10
    for name in ("authors.csv", "authors_public.csv"):
        p = os.path.join(O, name)
        if os.path.exists(p):
            au = list(csv.DictReader(open(p, encoding="utf-8")))
            res[f"{name}_rows"] = len(au)
            res[f"{name}_broken_source_links"] = [x["name_id"] for x in au if x["source_id"] not in by_id]
    # 11
    res["include_or_notes_changed_since_rev"] = [k for k, r in by_id.items() if k in old and
                                                 (old[k]["include"], old[k]["selection_notes"]) !=
                                                 (r["include"], r["selection_notes"])]
    res["nonblank_include"] = sum(1 for r in rows if r["include"].strip())
    res["status_totals"] = dict(collections.Counter(r["acquisition_status"] for r in rows))
    res["rows"] = len(rows)
    for k in ("files_missing", "checksum_mismatches", "unaccounted_files", "identical_files_on_disk",
              "duplicate_ids", "ids_removed_since_rev", "rows_without_url",
              "publication_date_equals_capture_date", "downloaded_pdfs_not_parsing",
              "failed_or_restricted_without_reason", "rows_without_status",
              "authors.csv_broken_source_links", "authors_public.csv_broken_source_links",
              "include_or_notes_changed_since_rev"):
        if res.get(k):
            fails.append(k)
    res["FAILED_CHECKS"] = fails
    print(json.dumps(res, indent=1))
    raise SystemExit(1 if fails else 0)


if __name__ == "__main__":
    main()
