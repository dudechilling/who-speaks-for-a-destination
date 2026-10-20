#!/usr/bin/env python3
"""Download candidate documents and maintain corpus/originals/source_index.csv.

Task: CMNS3500-P3-DISCOVERY-01 (preliminary historical source discovery).

Input: one or more JSON Lines candidate files (one candidate document per line,
fields as in the source index plus: fetch_url, acquisition_target, slug,
archive_capture_timestamp, date_evidence, title_basis, found_by).

What the script does:
1. Loads the existing index. User columns `include` and `selection_notes`
   are never changed for an existing row.
2. Merges candidates that point to the same original or archive URL.
3. Assigns a stable source_id: <REGION_CODE>_<YEAR or nd>_<Slug>[_NN].
   An existing row keeps its source_id.
4. Downloads DOWNLOAD candidates through polite_fetch (rate limits, robots.txt),
   with one worker thread per host (hosts run in parallel; one request per host).
   Rejects error pages and wrong file types. Never overwrites a file.
   Identical files (same SHA-256) are stored once. The extra URL goes to
   alternate_urls of the first row.
5. Stops new downloads at the byte budget (default 2 GB).
6. Writes the index as UTF-8 CSV (all fields quoted).

Usage:
    POLITE_STATE_DIR=... python3 -I scripts/collect.py --root "Working Files" cand1.jsonl ...
    python3 -I scripts/collect.py --root "Working Files" --updates updates.jsonl
        (updates: {"source_id": ..., "<column>": value, ...}; include/selection_notes ignored)
"""
import argparse
import csv
import datetime as dt
import hashlib
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import polite_fetch  # noqa: E402

REQUIRED = ["source_id", "region", "organization", "organization_name_at_publication",
            "document_title", "publication_year", "publication_date", "document_type",
            "author_or_signatory", "issuing_body", "source_class", "source_domain",
            "original_url", "archive_url", "alternate_urls", "retrieval_date", "local_file",
            "file_type", "sha256", "acquisition_status", "duplicate_of",
            "metadata_confidence", "availability_notes", "include", "selection_notes"]
EXTRA = ["archive_capture_date", "date_evidence", "title_basis", "file_size_bytes", "found_by",
         "date_status", "superseded_local_files"]  # last two added in CMNS3500-P3-DISCOVERY-02
COLUMNS = REQUIRED + EXTRA
USER_COLUMNS = {"include", "selection_notes"}
REGION_CODE = {"Vancouver_Island": "VI", "Thompson_Okanagan": "TO", "Kootenay_Rockies": "KR",
               "Northern_BC": "NB", "Cariboo_Chilcotin_Coast": "CC", "Multi_Region": "MR"}
SOURCE_CLASSES = {"official_sites", "wayback_machine", "government_archives",
                  "library_archives", "other_public_sources"}
EXT = {"application/pdf": "pdf", "text/html": "html", "application/msword": "doc",
       "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
       "application/vnd.ms-excel": "xls",
       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
       "application/vnd.ms-powerpoint": "ppt",
       "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
       "text/plain": "txt", "image/jpeg": "jpg", "image/png": "png", "image/tiff": "tif"}
ERROR_MARKERS = [b"Wayback Machine doesn't have that page archived",
                 b"Hrm.</h2>", b"<title>404", b"Page Not Found</title>", b"Page not found</title>",
                 b"<title>Not Found", b"This page is not available", b"Error 404"]


def index_path(root):
    return os.path.join(root, "corpus", "originals", "source_index.csv")


def load_index(root):
    p = index_path(root)
    if not os.path.exists(p):
        return []
    with open(p, newline="", encoding="utf-8") as f:
        return [dict(r) for r in csv.DictReader(f)]


def write_index(root, rows):
    p = index_path(root)
    tmp = p + ".tmp"
    rows = sorted(rows, key=lambda r: r["source_id"])
    with open(tmp, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS, quoting=csv.QUOTE_ALL, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({c: r.get(c, "") or "" for c in COLUMNS})
    os.replace(tmp, p)


def norm_url(u):
    u = (u or "").strip()
    u = re.sub(r"^https?://", "", u, flags=re.I)
    u = re.sub(r"^www\.", "", u, flags=re.I)
    u = re.sub(r":80/", "/", u)
    return u.rstrip("/").lower()


def wayback_original(u):
    m = re.match(r"https?://web\.archive\.org/web/\d+(?:[a-z_]+)?/(.+)$", u or "")
    return m.group(1) if m else ""


def keys_of(r):
    ks = set()
    for u in [r.get("original_url"), r.get("archive_url")] + \
            (r.get("alternate_urls") or "").split(" | "):
        if u:
            ks.add(norm_url(u))
    return ks - {""}


def slugify(s):
    s = re.sub(r"[^A-Za-z0-9]+", "_", s or "").strip("_")
    return s[:60] or "Document"


def new_id(cand, used):
    code = REGION_CODE.get(cand["region"], "XX")
    year = cand.get("publication_year") or "nd"
    base = f"{code}_{year}_{slugify(cand.get('slug') or cand.get('document_title'))}"
    sid, n = base, 1
    while sid in used:
        n += 1
        sid = f"{base}_{n:02d}"
    used.add(sid)
    return sid


def sniff(body):
    """Return MIME type from file content (not from server headers)."""
    h = body[:8]
    if h.startswith(b"%PDF"):
        return "application/pdf"
    if h.startswith(b"\xd0\xcf\x11\xe0"):
        return "application/msword"  # OLE container (doc/xls/ppt); refined below by `file`
    if h.startswith(b"PK"):
        return "application/zip"
    if h.startswith(b"\xff\xd8"):
        return "image/jpeg"
    if h.startswith(b"\x89PNG"):
        return "image/png"
    head = body[:2048].lower()
    if b"<html" in head or b"<!doctype html" in head:
        return "text/html"
    sample = body[:4096]
    if sample and b"\x00" not in sample:
        try:
            sample.decode("utf-8")
            return "text/plain"  # e.g. OCR text files published by digital newspaper archives
        except UnicodeDecodeError:
            pass
    return "application/octet-stream"


def file_mime(path):
    try:
        return subprocess.run(["file", "--mime-type", "-b", path], capture_output=True,
                              text=True, timeout=30).stdout.strip()
    except Exception:
        return ""


def is_error_page(body):
    head = body[:200_000]
    return any(m in head for m in ERROR_MARKERS) or len(body) < 200


def merge_candidates(paths):
    out = []
    for p in paths:
        with open(p, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    c = json.loads(line)
                except json.JSONDecodeError as e:
                    print(f"skip bad line in {p}: {e}", file=sys.stderr)
                    continue
                if isinstance(c.get("alternate_urls"), list):
                    c["alternate_urls"] = " | ".join(u for u in c["alternate_urls"] if u)
                if not c.get("original_url") and c.get("archive_url"):
                    c["original_url"] = wayback_original(c["archive_url"])
                out.append(c)
    return out


def add_alt(row, *urls):
    alts = [u for u in (row.get("alternate_urls") or "").split(" | ") if u]
    have = keys_of(row)
    for u in urls:
        if u and norm_url(u) not in have:
            alts.append(u)
            have.add(norm_url(u))
    row["alternate_urls"] = " | ".join(alts)


def capture_date(ts):
    ts = ts or ""
    return f"{ts[0:4]}-{ts[4:6]}-{ts[6:8]}" if re.fullmatch(r"\d{14}", ts) else ""


def downloaded_bytes(root, rows):
    total = 0
    for r in rows:
        if r.get("local_file"):
            p = os.path.join(root, "corpus", "originals", r["local_file"])
            if os.path.exists(p):
                total += os.path.getsize(p)
    return total


def register(rows, used, by_key, c, stats):
    """Add candidate c to rows (or merge it into an existing row). Return the row."""
    hit = next((by_key[k] for k in keys_of(c) if k in by_key), None)
    if hit:
        add_alt(hit, c.get("original_url"), c.get("archive_url"),
                *(c.get("alternate_urls") or "").split(" | "))
        for col in COLUMNS:  # fill blanks only; never touch user columns
            if col not in USER_COLUMNS and not hit.get(col) and c.get(col):
                hit[col] = c[col]
        stats["merged"] += 1
        return hit
    row = {col: "" for col in COLUMNS}
    for col in COLUMNS:
        if col not in USER_COLUMNS and col in c and isinstance(c[col], str):
            row[col] = c[col]
    row["source_id"] = new_id(c, used)
    row["archive_capture_date"] = capture_date(c.get("archive_capture_timestamp"))
    src = c.get("original_url") or c.get("archive_url") or c.get("fetch_url") or ""
    if "web.archive.org" in src:
        src = wayback_original(src) or src
    m = re.match(r"(?:https?://)?([^/:]+)", src)
    row["source_domain"] = re.sub(r"^www\.", "", m.group(1).lower()) if m else ""
    row["acquisition_status"] = {"DOWNLOAD": "", "METADATA_ONLY": "METADATA_ONLY",
                                 "UNAVAILABLE": "UNAVAILABLE",
                                 "ACCESS_RESTRICTED": "ACCESS_RESTRICTED"
                                 }.get(c.get("acquisition_target"), "METADATA_ONLY")
    rows.append(row)
    for k in keys_of(row):
        by_key.setdefault(k, row)
    stats["new_rows"] += 1
    return row


def run_collect(root, cand_paths, budget, max_hosts=16):
    """Register all candidates, then download with one worker per host."""
    import threading
    from concurrent.futures import ThreadPoolExecutor
    rows = load_index(root)
    used = {r["source_id"] for r in rows}
    by_key = {}
    for r in rows:
        for k in keys_of(r):
            by_key.setdefault(k, r)
    by_sha = {r["sha256"]: r for r in rows if r.get("sha256")}
    state = {"spent": downloaded_bytes(root, rows)}
    today = dt.datetime.now(dt.timezone.utc).date().isoformat()
    stats = {"new_rows": 0, "merged": 0, "downloaded": 0, "failed": 0, "dup_files": 0,
             "budget_skipped": 0}

    jobs = {}  # host -> [(row, fetch_url)]
    queued = set()
    for c in merge_candidates(cand_paths):
        if c.get("region") not in REGION_CODE or c.get("source_class") not in SOURCE_CLASSES:
            print(f"skip invalid region/source_class: {c.get('document_title')}", file=sys.stderr)
            continue
        row = register(rows, used, by_key, c, stats)
        if c.get("acquisition_target") != "DOWNLOAD" or row.get("local_file") or \
                not c.get("fetch_url") or id(row) in queued or row.get("acquisition_status") in (
                    "DOWNLOADED", "DOWNLOAD_FAILED", "ACCESS_RESTRICTED"):
            continue  # done, queued, or already attempted (re-attempt: clear the status first)
        queued.add(id(row))
        jobs.setdefault(polite_fetch._host(c["fetch_url"]), []).append((row, c["fetch_url"]))
    write_index(root, rows)
    lock = threading.Lock()

    def note(row, text):
        row["availability_notes"] = (row.get("availability_notes", "") + " " + text).strip()

    def one(row, url):
        with lock:
            if state["spent"] >= budget:
                row["acquisition_status"] = row.get("acquisition_status") or "METADATA_ONLY"
                note(row, "Not downloaded: download budget reached.")
                stats["budget_skipped"] += 1
                return
        res = polite_fetch.fetch(url)
        body = res.pop("body", b"")
        with lock:
            row["retrieval_date"] = today
            if res["error"] or res["status"] != 200 or not body:
                denied = res["status"] in (401, 403) or \
                    res["error"] in ("robots_disallowed", "host_denied_earlier")
                row["acquisition_status"] = "ACCESS_RESTRICTED" if denied else "DOWNLOAD_FAILED"
                note(row, f"Fetch failed: {res['error'] or res['status']} ({url}).")
                stats["failed"] += 1
                write_index(root, rows)
                return
            mime = sniff(body)
            expect_html = not url.lower().split("?")[0].endswith(
                (".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".rtf", ".txt"))
            if (mime == "text/html" and not expect_html) or is_error_page(body) or \
                    mime == "application/octet-stream":
                row["acquisition_status"] = "DOWNLOAD_FAILED"
                note(row, f"Fetch returned {mime} or an error page, not the expected document"
                          f" ({url}).")
                stats["failed"] += 1
                write_index(root, rows)
                return
            sha = hashlib.sha256(body).hexdigest()
            if sha in by_sha and by_sha[sha] is not row:
                canon = by_sha[sha]  # identical file: keep one row, record the extra URLs
                add_alt(canon, row.get("original_url"), row.get("archive_url"), url,
                        *(row.get("alternate_urls") or "").split(" | "))
                rows.remove(row)
                for k in keys_of(row):
                    by_key[k] = canon
                stats["dup_files"] += 1
                write_index(root, rows)
                return
            folder = os.path.join(root, "corpus", "originals", row["region"], row["source_class"])
            os.makedirs(folder, exist_ok=True)
            tmp = os.path.join(folder, f".{row['source_id']}.part")
            with open(tmp, "wb") as f:
                f.write(body)
            real = file_mime(tmp) or mime
            if real == "application/zip":
                real = mime
            ext = EXT.get(real, "bin")
            dest = os.path.join(folder, f"{row['source_id']}.{ext}")
            n = 1
            while os.path.exists(dest):  # never overwrite
                n += 1
                dest = os.path.join(folder, f"{row['source_id']}_{n:02d}.{ext}")
            os.rename(tmp, dest)
            row["local_file"] = os.path.relpath(dest, os.path.join(root, "corpus", "originals"))
            row["file_type"] = real
            row["sha256"] = sha
            row["file_size_bytes"] = str(len(body))
            row["acquisition_status"] = "DOWNLOADED"
            row["availability_notes"] = row.get("availability_notes", "").replace(
                "Not downloaded: download budget reached.", "").strip()
            by_sha[sha] = row
            state["spent"] += len(body)
            stats["downloaded"] += 1
            write_index(root, rows)
            print(f"OK {row['source_id']} {len(body)} B ({state['spent']/1e6:.0f} MB total)",
                  file=sys.stderr, flush=True)

    def host_worker(items):
        for row, url in items:
            try:
                one(row, url)
            except Exception as e:  # keep other hosts running
                with lock:
                    row["acquisition_status"] = "DOWNLOAD_FAILED"
                    note(row, f"Download error: {type(e).__name__} ({url}).")
                    stats["failed"] += 1

    with ThreadPoolExecutor(max_workers=max_hosts) as ex:
        for f in [ex.submit(host_worker, items) for items in jobs.values()]:
            f.result()

    for r in rows:
        if not r.get("acquisition_status"):
            r["acquisition_status"] = "METADATA_ONLY"
    write_index(root, rows)
    stats["total_rows"] = len(rows)
    stats["downloaded_bytes_total"] = state["spent"]
    print(json.dumps(stats))


def run_updates(root, path):
    rows = load_index(root)
    by_id = {r["source_id"]: r for r in rows}
    n = 0
    with open(path, encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            u = json.loads(line)
            r = by_id.get(u.pop("source_id", None))
            if not r:
                continue
            for k, v in u.items():
                if k in COLUMNS and k not in USER_COLUMNS | {"source_id", "sha256", "local_file"}:
                    r[k] = v
            n += 1
    write_index(root, rows)
    print(json.dumps({"updated_rows": n}))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, help="Working Files directory")
    ap.add_argument("--budget-bytes", type=int, default=2_000_000_000)
    ap.add_argument("--updates")
    ap.add_argument("candidates", nargs="*")
    a = ap.parse_args()
    if a.updates:
        run_updates(a.root, a.updates)
    if a.candidates:
        run_collect(a.root, a.candidates, a.budget_bytes)


if __name__ == "__main__":
    main()
