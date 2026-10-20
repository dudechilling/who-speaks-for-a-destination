#!/usr/bin/env python3
"""Rate-limited HTTP fetch for the CMNS 3500 Project 3 source discovery.

Rules (from task CMNS3500-P3-DISCOVERY-01, section 13):
- One active request per host, across all processes (per-host file lock).
- At least MIN_INTERVAL seconds between requests to the same host
  (longer for hosts in HOST_INTERVAL).
- Obey robots.txt.
- Obey HTTP 429 / 503 Retry-After. Stop a host after 401/403 (access denied).

Usage as a command:
    polite_fetch.py URL [-o OUTFILE] [--max-bytes N]
Prints one JSON line: status, final_url, content_type, bytes, error.
Without -o, the body is written to stdout only when it is text and smaller than 2 MB.

State (locks, last-request times, denied hosts, robots cache) is kept in
$POLITE_STATE_DIR (default: <system temp>/polite_fetch_state). It is not research data.
"""
import argparse
import fcntl
import json
import os
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser

USER_AGENT = ("Mozilla/5.0 (compatible; CMNS3500-source-inventory/1.0; "
              "student research project, low-rate document discovery)")
MIN_INTERVAL = 2.0
HOST_INTERVAL = {"web.archive.org": 4.0, "archive.org": 4.0}
STATE_DIR = os.environ.get("POLITE_STATE_DIR",
                           os.path.join(tempfile.gettempdir(), "polite_fetch_state"))
TIMEOUT = 90


def _host(url):
    return urllib.parse.urlsplit(url).hostname or ""


def _state(name):
    os.makedirs(STATE_DIR, exist_ok=True)
    return os.path.join(STATE_DIR, name)


def _denied(host):
    try:
        with open(_state("denied_hosts.txt")) as f:
            return host in {l.strip() for l in f}
    except FileNotFoundError:
        return False


def _mark_denied(host):
    with open(_state("denied_hosts.txt"), "a") as f:
        f.write(host + "\n")


class HostSlot:
    """Hold the per-host lock and enforce the minimum interval."""

    def __init__(self, host):
        self.host = host
        self.interval = HOST_INTERVAL.get(host, MIN_INTERVAL)
        self.lockf = open(_state(f"lock_{host}"), "a+")

    def __enter__(self):
        fcntl.flock(self.lockf, fcntl.LOCK_EX)
        self.lockf.seek(0)
        try:
            last = float(self.lockf.read().strip() or 0)
        except ValueError:
            last = 0
        wait = last + self.interval - time.time()
        if wait > 0:
            time.sleep(wait)
        return self

    def __exit__(self, *exc):
        self.lockf.seek(0)
        self.lockf.truncate()
        self.lockf.write(str(time.time()))
        self.lockf.flush()
        fcntl.flock(self.lockf, fcntl.LOCK_UN)
        self.lockf.close()


def _raw_get(url, max_bytes=None):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        body = r.read(max_bytes) if max_bytes else r.read()
        return r.status, r.geturl(), r.headers.get("Content-Type", ""), body


def robots_allowed(url):
    host = _host(url)
    parts = urllib.parse.urlsplit(url)
    cache = _state(f"robots_{host}.txt")
    if not os.path.exists(cache):
        robots_url = f"{parts.scheme}://{parts.netloc}/robots.txt"
        text = ""
        with HostSlot(host):
            try:
                _, _, _, body = _raw_get(robots_url, 500_000)
                text = body.decode("utf-8", "replace")
            except urllib.error.HTTPError as e:
                # 4xx other than 401/403 means no robots file: allowed.
                text = "User-agent: *\nDisallow: /\n" if e.code in (401, 403) else ""
            except Exception:
                text = ""
        with open(cache, "w") as f:
            f.write(text)
    rp = urllib.robotparser.RobotFileParser()
    with open(cache) as f:
        rp.parse(f.read().splitlines())
    return rp.can_fetch(USER_AGENT, url)


def fetch(url, max_bytes=None, retries=2):
    """Return dict(status, final_url, content_type, body, error)."""
    host = _host(url)
    out = {"url": url, "status": None, "final_url": None, "content_type": None,
           "body": b"", "error": None}
    if _denied(host):
        out["error"] = "host_denied_earlier"
        return out
    if not robots_allowed(url):
        out["error"] = "robots_disallowed"
        return out
    for attempt in range(retries + 1):
        with HostSlot(host):
            try:
                out["status"], out["final_url"], out["content_type"], out["body"] = \
                    _raw_get(url, max_bytes)
                out["error"] = None
                return out
            except urllib.error.HTTPError as e:
                out["status"] = e.code
                out["error"] = f"http_{e.code}"
                retry_after = e.headers.get("Retry-After") if e.headers else None
            except Exception as e:  # network errors
                out["error"] = f"{type(e).__name__}: {e}"[:300]
                retry_after = None
        if out["status"] in (401, 403):
            _mark_denied(host)
            return out
        if out["status"] in (429, 503) and attempt < retries:
            try:
                delay = min(int(retry_after), 600) if retry_after else 60
            except ValueError:
                delay = 60
            time.sleep(delay)
            continue
        if out["status"] is None and attempt < retries:
            time.sleep(10)
            continue
        return out
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("-o", "--output")
    ap.add_argument("--max-bytes", type=int)
    a = ap.parse_args()
    r = fetch(a.url, a.max_bytes)
    body = r.pop("body")
    r["bytes"] = len(body)
    if a.output and body:
        with open(a.output, "wb") as f:
            f.write(body)
    print(json.dumps(r), file=sys.stderr if not a.output else sys.stdout)
    if not a.output and body and len(body) < 2_000_000 and \
            ("text" in (r["content_type"] or "") or "json" in (r["content_type"] or "")):
        sys.stdout.write(body.decode("utf-8", "replace"))


if __name__ == "__main__":
    main()
