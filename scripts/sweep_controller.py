#!/usr/bin/env python3
"""Restartable sweep controller for task CMNS3500-P3-DISCOVERY-02.

The controller runs download/recovery jobs for one discovery sweep and keeps a
machine-readable state file. It reuses collect.py (index schema and helpers) and
polite_fetch.py (one request per host, >= 2 s / 4 s for archive.org, robots.txt,
429/Retry-After, stop on 401/403).

Commands
    run     --sweep N --queue JOBS.jsonl   Process jobs. Safe to restart: finished jobs are skipped.
    status                                 Print the state file.
    record  --sweep N KEY=VALUE ...        Record searches, leads, git SHA, push confirmation.
    build-sweep1 --out JOBS.jsonl          Build the sweep-1 recovery queue from the index.

Job format (JSON Lines):
    {"job_id": "...", "op": "download" | "recover" | "register", "priority": 1..9,
     "source_id": "...",            (download / recover: an existing index row)
     "urls": ["...", ...],          (tried in order; the first complete file wins)
     "candidate": {...},            (register: a new candidate in the collect.py format)
     "reason": "..."}

Rules
- One controller per source index (non-blocking file lock; a second run exits).
- State is written atomically (temp file + rename) after every job and by a
  30-second heartbeat thread. The heartbeat sends no network requests.
- Additional-byte cap (default 4,000,000,000) and a free-disk floor (default 5 GB)
  are checked before and after every transfer. When a limit is reached, downloads stop.
- A file is accepted only when: HTTP 200, body length matches Content-Length (when
  given), the content type matches the request, it is not an error page, and a PDF
  parses with pdfinfo. A parse failure is stored as DOWNLOADED_INCOMPLETE.
- An existing original is never overwritten. A recovered complete copy is stored as
  <source_id>_complete.<ext>; the truncated file stays and is listed in
  superseded_local_files with its SHA-256.
- Every attempt is appended to corpus/originals/acquisition_log.jsonl (no content).
- include and selection_notes are never changed.

State file: .discovery_state/controller.json (local only, not published).
"""
import argparse
import datetime as dt
import fcntl
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import collect  # noqa: E402
import polite_fetch  # noqa: E402

TASK = "CMNS3500-P3-DISCOVERY-02"
BASELINE_BYTES = 1_982_683_550  # local originals at the end of DISCOVERY-01
DOC_EXT = (".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".rtf", ".txt")
PRIORITY_D = re.compile(r"newsletter|institutional publication|visitor guide|brochure|"
                        r"unclassified|other", re.I)
NOT_RETRYABLE = re.compile(r"robots_disallowed|host_denied_earlier|http_401|http_403|"
                           r"bot challenge|login|members-only", re.I)


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


class Controller:
    def __init__(self, root, cap, disk_floor):
        self.root = root
        self.odir = os.path.join(root, "corpus", "originals")
        self.sdir = os.path.join(root, ".discovery_state")
        os.makedirs(self.sdir, exist_ok=True)
        os.environ.setdefault("POLITE_STATE_DIR", os.path.join(self.sdir, "polite"))
        polite_fetch.STATE_DIR = os.environ["POLITE_STATE_DIR"]
        self.state_path = os.path.join(self.sdir, "controller.json")
        self.log_path = os.path.join(self.odir, "acquisition_log.jsonl")
        self.cap = cap
        self.disk_floor = disk_floor
        self.lock = threading.RLock()
        self.state = self.load_state()
        self.state["bytes"]["cap"] = cap

    # ---------- state ----------
    def load_state(self):
        if os.path.exists(self.state_path):
            with open(self.state_path) as f:
                return json.load(f)
        return {"task": TASK, "sweep": 0, "phase": "", "current_task": "", "current_source": "",
                "started_at": now(), "last_checkpoint_at": "", "heartbeat": {},
                "bytes": {"baseline_local": BASELINE_BYTES, "task_added": 0, "cap": 0},
                "jobs": {}, "retry": {}, "checksums": {"verified": 0, "mismatched": 0},
                "sweeps": {}, "stop_reason": ""}

    def save_state(self):
        with self.lock:
            tmp = self.state_path + ".tmp"
            with open(tmp, "w") as f:
                json.dump(self.state, f, indent=1, sort_keys=True)
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp, self.state_path)

    def sweep_rec(self, n):
        return self.state["sweeps"].setdefault(str(n), {
            "started_at": now(), "finished_at": "", "searches_completed": 0,
            "new_candidates": 0, "downloads": 0, "recovered": 0, "failed": 0,
            "duplicates": 0, "bytes_added": 0, "unresolved_leads": 0,
            "commit_sha": "", "pushed": False, "push_verified_at": ""})

    def log(self, event):
        event["at"] = now()
        with open(self.log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(event, sort_keys=True) + "\n")

    def heartbeat(self, stop):
        while not stop.wait(30):
            with self.lock:
                done = sum(1 for j in self.state["jobs"].values() if j.get("done"))
                self.state["heartbeat"] = {"at": now(), "pid": os.getpid(), "jobs_done": done,
                                           "task_bytes": self.state["bytes"]["task_added"]}
            self.save_state()

    # ---------- limits ----------
    def free(self):
        return shutil.disk_usage(self.root).free

    def limits_ok(self, size=0):
        b = self.state["bytes"]
        if b["task_added"] + size > self.cap:
            return "byte_cap"
        if self.free() - size < self.disk_floor:
            return "disk_floor"
        return ""

    # ---------- checks ----------
    @staticmethod
    def pdf_ok(path):
        try:
            return subprocess.run(["pdfinfo", path], capture_output=True,
                                  timeout=120).returncode == 0
        except Exception:
            return False

    def accept(self, url, res, body):
        """Return (ok, mime, reason)."""
        if res["error"] or res["status"] != 200 or not body:
            return False, "", f"{res['error'] or res['status']}"
        h = {k.lower(): v for k, v in (res.get("headers") or {}).items()}
        cl = h.get("content-length")
        if cl and cl.isdigit() and int(cl) != len(body):
            return False, "", f"short_transfer {len(body)} of {cl} bytes"
        mime = collect.sniff(body)
        path = url.lower().split("?")[0]
        expect_doc = path.endswith(DOC_EXT) and not path.endswith(".txt")
        if expect_doc and mime in ("text/html", "text/plain"):
            return False, mime, f"wrong_type ({mime} for a document URL)"
        if (path.endswith(".pdf") and mime != "application/pdf") or \
                collect.is_error_page(body) or mime == "application/octet-stream":
            return False, mime, f"wrong_type_or_error_page ({mime})"
        return True, mime, ""

    # ---------- storage ----------
    def store(self, row, body, mime, suffix=""):
        folder = os.path.join(self.odir, row["region"], row["source_class"])
        os.makedirs(folder, exist_ok=True)
        tmp = os.path.join(folder, f".{row['source_id']}{suffix}.part")
        with open(tmp, "wb") as f:
            f.write(body)
        real = collect.file_mime(tmp) or mime
        if real == "application/zip":
            real = mime
        parsed = self.pdf_ok(tmp) if real == "application/pdf" else True
        ext = collect.EXT.get(real, "bin")
        dest = os.path.join(folder, f"{row['source_id']}{suffix}.{ext}")
        n = 1
        while os.path.exists(dest):  # never overwrite
            n += 1
            dest = os.path.join(folder, f"{row['source_id']}{suffix}_{n:02d}.{ext}")
        os.rename(tmp, dest)
        return os.path.relpath(dest, self.odir), real, parsed

    # ---------- jobs ----------
    def cdx_alternatives(self, original_url, exclude_digest_of=None):
        """Other Wayback captures of the same URL (distinct digests, largest first)."""
        q = ("https://web.archive.org/cdx/search/cdx?url=" + original_url +
             "&output=json&fl=timestamp,digest,length,statuscode&filter=statuscode:200")
        res = polite_fetch.fetch(q)
        try:
            data = json.loads(res["body"] or b"[]")[1:]
        except ValueError:
            return []
        seen, out = set(), []
        for ts, dg, ln, _ in sorted(data, key=lambda r: -int(r[2] or 0)):
            if dg in seen:
                continue
            seen.add(dg)
            out.append(f"https://web.archive.org/web/{ts}id_/{original_url}")
        return out

    def run_job(self, job, rows, by_id, by_sha, used, by_key, sweep, stop_flag):
        jid = job["job_id"]
        rec = self.sweep_rec(sweep)
        if self.state["jobs"].get(jid, {}).get("done"):
            return
        if stop_flag.is_set():
            return
        op = job["op"]
        with self.lock:
            if op == "register":
                stats = {"new_rows": 0, "merged": 0}
                row = collect.register(rows, used, by_key, job["candidate"], stats)
                by_id[row["source_id"]] = row
                rec["new_candidates"] += stats["new_rows"]
                job.setdefault("source_id", row["source_id"])
                c = job["candidate"]
                if c.get("acquisition_target") != "DOWNLOAD" or not c.get("fetch_url") or \
                        row.get("local_file"):
                    self.state["jobs"][jid] = {"done": True, "result": "registered",
                                               "source_id": row["source_id"], "at": now()}
                    collect.write_index(self.root, rows)
                    return
                job["urls"] = [c["fetch_url"]] + [u for u in (c.get("alternate_urls") or "")
                                                  .split(" | ") if u and "web.archive.org" not in u]
            row = by_id.get(job["source_id"])
            if row is None:
                self.state["jobs"][jid] = {"done": True, "result": "unknown_source_id", "at": now()}
                return
            if op in ("download", "register") and row.get("acquisition_status") == "DOWNLOADED":
                self.state["jobs"][jid] = {"done": True, "result": "already_downloaded", "at": now()}
                return
            self.state["current_task"] = f"{op} {row['source_id']}"
        urls = list(job.get("urls") or [])
        if (op == "recover" or job.get("cdx")) and row.get("original_url"):
            urls += self.cdx_alternatives(row["original_url"])  # other Wayback captures
        tried, result = [], None
        for url in dict.fromkeys(urls):  # de-duplicate, keep order
            with self.lock:
                self.state["current_source"] = url
                lim = self.limits_ok()
            if lim:
                with self.lock:
                    self.state["stop_reason"] = lim
                stop_flag.set()
                return
            res = polite_fetch.fetch(url)
            body = res.pop("body", b"")
            ok, mime, reason = self.accept(url, res, body)
            self.log({"task": TASK, "sweep": sweep, "op": op, "source_id": row["source_id"],
                      "url": url, "status": res["status"], "error": res["error"],
                      "bytes": len(body), "accepted": ok, "reason": reason,
                      "archive_src": (res.get("headers") or {}).get("x-archive-src", "")})
            tried.append(f"{url} -> {reason or 'ok'}")
            if not ok:
                if res["error"] in ("robots_disallowed", "host_denied_earlier") or \
                        res["status"] in (401, 403):
                    result = ("ACCESS_RESTRICTED", reason)
                elif result is None:
                    result = ("DOWNLOAD_FAILED", reason)
                continue
            with self.lock:
                lim = self.limits_ok(len(body))
                if lim:
                    self.state["stop_reason"] = lim
                    stop_flag.set()
                    return
                sha = hashlib.sha256(body).hexdigest()
                if sha in by_sha and by_sha[sha] is not row:
                    canon = by_sha[sha]
                    collect.add_alt(canon, url)
                    row["duplicate_of"] = canon["source_id"]
                    row["acquisition_status"] = "DUPLICATE"
                    row["availability_notes"] = (row.get("availability_notes", "") +
                        f" Retrieved file is identical (SHA-256) to {canon['source_id']};"
                        " not stored twice.").replace(
                        "Not downloaded: download budget reached.", "").strip()
                    rec["duplicates"] += 1
                    self.state["jobs"][jid] = {"done": True, "result": "duplicate", "at": now()}
                    self.log({"task": TASK, "sweep": sweep, "op": "duplicate",
                              "source_id": row["source_id"], "duplicate_of": canon["source_id"],
                              "sha256": sha})
                    collect.write_index(self.root, rows)
                    self.save_state()
                    return
                suffix = "_complete" if op == "recover" else ""
                rel, real, parsed = self.store(row, body, mime, suffix)
                if real == "application/pdf" and not parsed:
                    # keep the evidence only when the row has no file yet
                    if op == "recover":
                        os.remove(os.path.join(self.odir, rel))
                        self.log({"task": TASK, "sweep": sweep, "op": op,
                                  "source_id": row["source_id"], "url": url,
                                  "accepted": False, "reason": "pdf_parse_failed"})
                        tried[-1] = f"{url} -> pdf_parse_failed"
                        continue
                    status = "DOWNLOADED_INCOMPLETE"
                else:
                    status = "DOWNLOADED"
                if op == "recover":
                    old = f"{row['local_file']} (sha256 {row['sha256']}, {row['file_size_bytes']} bytes)"
                    row["superseded_local_files"] = " | ".join(
                        x for x in [row.get("superseded_local_files"), old] if x)
                    row["availability_notes"] = (row.get("availability_notes", "") +
                        f" Sweep {sweep}: complete copy retrieved from {url} and verified"
                        " (length, type, PDF parse); the truncated file is kept and listed in"
                        " superseded_local_files.").strip()
                    rec["recovered"] += 1
                if url.startswith("https://web.archive.org/web/") and op != "recover" and \
                        not row.get("archive_url"):
                    row["archive_url"] = url.replace("id_/", "/", 1)
                if op != "recover" and url not in (row.get("original_url"), row.get("archive_url")):
                    collect.add_alt(row, url)
                row.update({"local_file": rel, "file_type": real, "sha256": sha,
                            "file_size_bytes": str(len(body)), "acquisition_status": status,
                            "retrieval_date": now()[:10]})
                row["availability_notes"] = row.get("availability_notes", "").replace(
                    "Not downloaded: download budget reached.", "").strip()
                if status == "DOWNLOADED_INCOMPLETE":
                    row["availability_notes"] += " Retrieved PDF does not parse (pdfinfo)."
                by_sha[sha] = row
                self.state["bytes"]["task_added"] += len(body)
                rec["bytes_added"] += len(body)
                rec["downloads"] += 1
                self.state["jobs"][jid] = {"done": True, "result": status, "url": url,
                                           "sha256": sha, "at": now()}
                self.state["retry"].pop(row["source_id"], None)
                self.log({"task": TASK, "sweep": sweep, "op": "stored",
                          "source_id": row["source_id"], "local_file": rel, "sha256": sha,
                          "bytes": len(body), "status": status, "url": url})
                collect.write_index(self.root, rows)
                self.save_state()
            print(f"OK {row['source_id']} {len(body)} B", file=sys.stderr, flush=True)
            return
        # every URL failed
        with self.lock:
            status, reason = result or ("DOWNLOAD_FAILED", "no_url")
            if op == "recover":
                row["availability_notes"] = (row.get("availability_notes", "") +
                    f" Sweep {sweep}: recovery failed ({'; '.join(tried)[:400]}).").strip()
            else:
                if row.get("acquisition_status") not in ("DOWNLOADED_INCOMPLETE",):
                    row["acquisition_status"] = status
                row["availability_notes"] = (row.get("availability_notes", "").replace(
                    "Not downloaded: download budget reached.", "") +
                    f" Sweep {sweep}: fetch failed ({'; '.join(tried)[:400]}).").strip()
            r = self.state["retry"].setdefault(row["source_id"], {"attempts": 0})
            r["attempts"] += 1
            r["last_error"] = reason
            r["eligible"] = status != "ACCESS_RESTRICTED" and r["attempts"] < 2 and \
                not reason.startswith("http_404")
            r["next_retry_at"] = (dt.datetime.now(dt.timezone.utc) +
                                  dt.timedelta(hours=6)).isoformat(timespec="seconds") \
                if r["eligible"] else ""
            rec["failed"] += 1
            self.state["jobs"][jid] = {"done": True, "result": status, "reason": reason,
                                       "at": now()}
            collect.write_index(self.root, rows)
            self.save_state()

    def run(self, sweep, queue_path, max_hosts):
        lockf = open(os.path.join(self.odir, ".source_index.lock"), "w")
        try:
            fcntl.flock(lockf, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print("another controller holds the source index lock; exiting", file=sys.stderr)
            sys.exit(3)
        jobs = [json.loads(l) for l in open(queue_path) if l.strip()]
        jobs.sort(key=lambda j: j.get("priority", 5))
        rows = collect.load_index(self.root)
        by_id = {r["source_id"]: r for r in rows}
        by_sha = {r["sha256"]: r for r in rows if r.get("sha256")}
        used = set(by_id)
        by_key = {}
        for r in rows:
            for k in collect.keys_of(r):
                by_key.setdefault(k, r)
        with self.lock:
            self.state["sweep"] = sweep
            self.state["phase"] = "downloading"
            self.state["stop_reason"] = ""
            rec = self.sweep_rec(sweep)
            rec["queue"] = os.path.basename(queue_path)
            rec["jobs_total"] = len(jobs)
        self.save_state()
        stop = threading.Event()
        stop_flag = threading.Event()
        hb = threading.Thread(target=self.heartbeat, args=(stop,), daemon=True)
        hb.start()
        groups = {}
        for j in jobs:
            first = (j.get("urls") or [j.get("candidate", {}).get("fetch_url", "")] or [""])[0]
            groups.setdefault(polite_fetch._host(first or "none"), []).append(j)

        def worker(items):
            for j in items:
                try:
                    self.run_job(j, rows, by_id, by_sha, used, by_key, sweep, stop_flag)
                except Exception as e:
                    print(f"job {j.get('job_id')} error: {type(e).__name__}: {e}", file=sys.stderr)
                    self.log({"task": TASK, "sweep": sweep, "op": "error",
                              "job_id": j.get("job_id"), "error": f"{type(e).__name__}: {e}"[:300]})

        with ThreadPoolExecutor(max_workers=max_hosts) as ex:
            for f in [ex.submit(worker, items) for items in groups.values()]:
                f.result()
        stop.set()
        with self.lock:
            for r in rows:
                if not r.get("acquisition_status"):
                    r["acquisition_status"] = "METADATA_ONLY"
            collect.write_index(self.root, rows)
            done = sum(1 for j in jobs if self.state["jobs"].get(j["job_id"], {}).get("done"))
            rec["jobs_done"] = done
            self.state["phase"] = "downloads_finished" if done == len(jobs) else "stopped"
            self.state["current_task"] = ""
            self.state["current_source"] = ""
            self.state["last_checkpoint_at"] = now()
        self.save_state()
        print(json.dumps({"sweep": sweep, "jobs": len(jobs), "done": done,
                          "stop_reason": self.state["stop_reason"],
                          "task_bytes": self.state["bytes"]["task_added"]}))

    # ---------- sweep 1 queue ----------
    def build_sweep1(self, out, records_dir):
        rows = collect.load_index(self.root)
        fetch = {}
        for dp, _, fs in os.walk(records_dir):
            for fn in fs:
                if fn.endswith("_candidates.jsonl"):
                    for line in open(os.path.join(dp, fn), encoding="utf-8"):
                        if line.strip():
                            c = json.loads(line)
                            for u in (c.get("original_url"), c.get("archive_url")):
                                if u and c.get("fetch_url"):
                                    fetch[collect.norm_url(u)] = c["fetch_url"]

        def idform(u):
            return re.sub(r"(web\.archive\.org/web/\d+)/", r"\1id_/", u) if u else ""

        def urls_for(r):
            us = [fetch.get(collect.norm_url(r["original_url"])),
                  fetch.get(collect.norm_url(r["archive_url"]))]
            us += [idform(r["archive_url"]), r["original_url"]]
            us += [idform(u) for u in (r.get("alternate_urls") or "").split(" | ")]
            return [u for u in dict.fromkeys(us) if u and u.startswith("http")]

        jobs = []
        for r in rows:
            st, notes = r["acquisition_status"], r["availability_notes"]
            sid = r["source_id"]
            if st == "DOWNLOADED_INCOMPLETE":
                urls = [r["original_url"]] + [idform(u) for u in
                                              (r.get("alternate_urls") or "").split(" | ") if u]
                jobs.append({"job_id": f"s1-recover-{sid}", "op": "recover", "priority": 1,
                             "source_id": sid, "urls": [u for u in urls if u],
                             "reason": "incomplete file"})
            elif st == "METADATA_ONLY" and "budget reached" in notes:
                d = bool(PRIORITY_D.search(r["document_type"] or ""))
                guide = "visitor guide" in (r["document_type"] or "").lower()
                jobs.append({"job_id": f"s1-dl-{sid}", "op": "download",
                             "priority": 2 if not d else (6 if guide else 5),
                             "source_id": sid, "urls": urls_for(r),
                             "reason": "budget-skipped " + ("priority D" if d else "priority A-C")})
            elif st == "DOWNLOAD_FAILED" and not NOT_RETRYABLE.search(notes):
                if re.search(r"http_404|http_410", notes) and len(urls_for(r)) < 2:
                    continue
                jobs.append({"job_id": f"s1-retry-{sid}", "op": "download", "priority": 3,
                             "source_id": sid, "urls": urls_for(r), "reason": "retry failed"})
            elif st == "METADATA_ONLY":
                us = [u for u in urls_for(r)
                      if u.lower().split("?")[0].endswith(DOC_EXT)]
                if us:
                    jobs.append({"job_id": f"s1-meta-{sid}", "op": "download", "priority": 4,
                                 "source_id": sid, "urls": us,
                                 "reason": "metadata-only with document link"})
        with open(out, "w") as f:
            for j in jobs:
                f.write(json.dumps(j) + "\n")
        print(json.dumps({"jobs": len(jobs), "by_priority": {p: sum(1 for j in jobs if j["priority"] == p)
                                                             for p in sorted({j["priority"] for j in jobs})}}))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ap.add_argument("--cap-bytes", type=int, default=4_000_000_000)
    ap.add_argument("--disk-floor", type=int, default=5_000_000_000)
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run")
    r.add_argument("--sweep", type=int, required=True)
    r.add_argument("--queue", required=True)
    r.add_argument("--max-hosts", type=int, default=12)
    sub.add_parser("status")
    rc = sub.add_parser("record")
    rc.add_argument("--sweep", type=int, required=True)
    rc.add_argument("pairs", nargs="+")
    b = sub.add_parser("build-sweep1")
    b.add_argument("--out", required=True)
    b.add_argument("--records", default=None)
    a = ap.parse_args()
    c = Controller(a.root, a.cap_bytes, a.disk_floor)
    if a.cmd == "run":
        c.run(a.sweep, a.queue, a.max_hosts)
    elif a.cmd == "status":
        print(json.dumps({k: v for k, v in c.state.items() if k != "jobs"}, indent=1))
        print("jobs recorded:", len(c.state["jobs"]))
    elif a.cmd == "record":
        rec = c.sweep_rec(a.sweep)
        for p in a.pairs:
            k, v = p.split("=", 1)
            rec[k] = int(v) if v.isdigit() else (v == "true" if v in ("true", "false") else v)
        if "pushed" in rec and rec["pushed"] is True:
            rec["push_verified_at"] = now()
        c.state["last_checkpoint_at"] = now()
        c.save_state()
        print(json.dumps(rec, indent=1))
    elif a.cmd == "build-sweep1":
        c.build_sweep1(a.out, a.records or os.path.join(a.root, "results", "discovery_records"))


if __name__ == "__main__":
    main()
