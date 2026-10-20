#!/usr/bin/env python3
"""Compare the current source index with the version in a Git revision (default HEAD).

Prints JSON with the changes a sweep report needs: new rows, status transitions,
new downloads, recovered files, duplicates, dates added or changed, bytes added,
and current totals. Only metadata is read; no file content.

Usage: python3 -I scripts/sweep_stats.py [--rev HEAD] [--sweep N]
"""
import argparse
import collections
import csv
import io
import json
import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDX = "corpus/originals/source_index.csv"


def load(text):
    return {r["source_id"]: r for r in csv.DictReader(io.StringIO(text))}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rev", default="HEAD")
    ap.add_argument("--sweep", type=int)
    a = ap.parse_args()
    old = load(subprocess.run(["git", "-C", ROOT, "show", f"{a.rev}:{IDX}"],
                              capture_output=True, text=True, check=True).stdout)
    new = load(open(os.path.join(ROOT, IDX), encoding="utf-8").read())
    added = [k for k in new if k not in old]
    removed = [k for k in old if k not in new]
    trans = collections.Counter()
    newly_dl, recovered, dup, date_changes, inc_changed = [], [], [], [], []
    user_changed = []
    bytes_added = 0
    for k, r in new.items():
        o = old.get(k)
        if o is None:
            if r["acquisition_status"] == "DOWNLOADED":
                newly_dl.append(k)
                bytes_added += int(r["file_size_bytes"] or 0)
            continue
        if o["acquisition_status"] != r["acquisition_status"]:
            trans[f"{o['acquisition_status']} -> {r['acquisition_status']}"] += 1
        if r["acquisition_status"] == "DOWNLOADED" and o["acquisition_status"] != "DOWNLOADED":
            (recovered if o["acquisition_status"] == "DOWNLOADED_INCOMPLETE" else newly_dl).append(k)
            bytes_added += int(r["file_size_bytes"] or 0)
        if r["acquisition_status"] == "DUPLICATE" and o["acquisition_status"] != "DUPLICATE":
            dup.append(k)
        if (o["publication_year"], o["publication_date"]) != (r["publication_year"], r["publication_date"]):
            date_changes.append({"source_id": k, "old": [o["publication_year"], o["publication_date"]],
                                 "new": [r["publication_year"], r["publication_date"]],
                                 "date_status": r.get("date_status", ""),
                                 "evidence": (r.get("date_evidence") or "")[:160]})
        if (o["include"], o["selection_notes"]) != (r["include"], r["selection_notes"]):
            user_changed.append(k)
    st = collections.Counter(r["acquisition_status"] for r in new.values())
    out = {
        "sweep": a.sweep, "compared_with": a.rev,
        "rows_before": len(old), "rows_after": len(new),
        "new_rows": len(added), "removed_rows": removed,
        "new_rows_by_status": dict(collections.Counter(new[k]["acquisition_status"] for k in added)),
        "status_transitions": dict(trans),
        "newly_downloaded": len(newly_dl), "recovered_incomplete": recovered,
        "new_duplicates": dup, "bytes_added_by_index": bytes_added,
        "date_changes": len(date_changes), "date_change_examples": date_changes[:10],
        "date_status_counts": dict(collections.Counter(r.get("date_status") or "(blank)"
                                                       for r in new.values())),
        "rows_without_year": sum(1 for r in new.values() if not r["publication_year"]),
        "include_or_selection_notes_changed": user_changed,
        "status_totals": dict(st),
    }
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
