#!/usr/bin/env python3
"""Identify the actual Wayback capture behind each retrieved Wayback file (sweep 4).

Problem found in sweep 3: some candidates gave an approximate capture timestamp. The
Wayback Machine then serves the closest capture, which can be years away from the
recorded archive_capture_date.

Method (no file is downloaded again):
1. compute the SHA-1 (base32) of the local file — the same digest form the Wayback CDX uses;
2. query the CDX for the original URL (polite_fetch: one request per host, >= 4 s);
3. find the capture(s) with a matching digest.

Index updates (source_index.csv; source_id, include, selection_notes unchanged):
- match found and the date differs: archive_capture_date and archive_url are set to the
  matching capture; the earlier values are kept in availability_notes;
- match found and the date agrees: availability_notes records "capture verified by digest";
- no match: availability_notes records that the capture could not be verified by digest.
Publication dates are never set from capture dates.

Runs under the same non-blocking index lock as sweep_controller.py.
Usage: POLITE_STATE_DIR=... python3 -I scripts/verify_wayback_captures.py [--limit N]
"""
import argparse
import base64
import fcntl
import hashlib
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import collect  # noqa: E402
import polite_fetch  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
O = os.path.join(ROOT, "corpus", "originals")
MARK = "Capture verified by digest"


def sha1_b32(path):
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return base64.b32encode(h.digest()).decode()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    a = ap.parse_args()
    os.environ.setdefault("POLITE_STATE_DIR", os.path.join(ROOT, ".discovery_state", "polite"))
    polite_fetch.STATE_DIR = os.environ["POLITE_STATE_DIR"]
    lockf = open(os.path.join(O, ".source_index.lock"), "w")
    try:
        fcntl.flock(lockf, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        sys.exit("another process holds the source index lock")
    rows = collect.load_index(ROOT)
    todo = [r for r in rows if r["acquisition_status"] == "DOWNLOADED" and r["local_file"]
            and r["source_class"] == "wayback_machine" and r["original_url"]
            and "digest" not in r["availability_notes"]]
    if a.limit:
        todo = todo[:a.limit]
    stats = {"checked": 0, "verified_same_date": 0, "corrected": 0, "no_match": 0, "cdx_error": 0}
    for i, r in enumerate(todo, 1):
        dg = sha1_b32(os.path.join(O, r["local_file"]))
        url = re.sub(r"^https?://", "", r["original_url"])
        res = polite_fetch.fetch("https://web.archive.org/cdx/search/cdx?url=" + url +
                                 "&output=json&fl=timestamp,digest&filter=statuscode:200")
        stats["checked"] += 1
        try:
            data = json.loads(res["body"] or b"[]")[1:]
        except ValueError:
            data = None
        if res["error"] or data is None:
            stats["cdx_error"] += 1
            continue
        ts = sorted(t for t, d in data if d == dg)
        if not ts:
            r["availability_notes"] = (r["availability_notes"] + " Sweep 4: the retrieved file's digest"
                                       " matches no CDX capture of the original URL; capture date not"
                                       " verified by digest.").strip()
            stats["no_match"] += 1
        else:
            first = ts[0]
            cap = f"{first[0:4]}-{first[4:6]}-{first[6:8]}"
            span = f"{ts[0][:8]}–{ts[-1][:8]}" if len(ts) > 1 else ts[0][:8]
            if cap != r["archive_capture_date"]:
                r["availability_notes"] = (r["availability_notes"] + f" Sweep 4 correction: the retrieved"
                    f" file matches Wayback capture(s) {span} by digest; earlier archive_capture_date"
                    f" {r['archive_capture_date'] or '(none)'} and archive_url {r['archive_url'] or '(none)'}"
                    " referred to another capture.").strip()
                r["archive_capture_date"] = cap
                r["archive_url"] = f"https://web.archive.org/web/{first}/{r['original_url']}"
                stats["corrected"] += 1
            else:
                r["availability_notes"] = (r["availability_notes"] +
                                           f" {MARK} (sweep 4; matching captures {span}).").strip()
                stats["verified_same_date"] += 1
        if i % 25 == 0:
            collect.write_index(ROOT, rows)
            print(json.dumps(stats), flush=True)
    collect.write_index(ROOT, rows)
    print(json.dumps(stats), flush=True)


if __name__ == "__main__":
    main()
