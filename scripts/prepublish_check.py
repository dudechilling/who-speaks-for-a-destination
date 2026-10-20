#!/usr/bin/env python3
"""Privacy, secrets and content check for the files staged in Git.

Run after staging with an explicit allowlist and before every commit.
Exit status 1 when any check fails.

Checks on every staged file:
- path: no file under corpus/originals/ except source_index.csv, authors_public.csv,
  acquisition_log.jsonl; never authors.csv, methodology.md, *.docx, .discovery_state/,
  corpus/derived/, corpus/treated/;
- type: no PDF, office, image or archive content (checked by content, not extension);
- size: no file over 10 MB;
- secrets: token, key and password patterns;
- personal contact data: phone numbers anywhere; email addresses whose local part is
  not a generic role mailbox (info, admin, contact, ...);
- local paths: home directories, temporary and agent scratch paths (prompt records,
  which must stay verbatim, are reported but not failed for the working-directory path).

Usage: python3 -I scripts/prepublish_check.py
"""
import re
import subprocess
import sys

ALLOWED_ORIGINALS = {"corpus/originals/source_index.csv", "corpus/originals/authors_public.csv",
                     "corpus/originals/acquisition_log.jsonl"}
FORBIDDEN = re.compile(r"(^|/)(authors\.csv|methodology\.md)$|\.docx$|^\.discovery_state/|"
                       r"^corpus/(derived|treated)/")
SECRET = re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|"
                    r"AKIA[0-9A-Z]{16}|BEGIN [A-Z ]*PRIVATE KEY|xox[baprs]-[A-Za-z0-9-]{10,}|"
                    r"(?i:password|passwd|api[_-]?key|secret|bearer)\s*[:=]\s*['\"]?[A-Za-z0-9/+_.-]{8,}")
EMAIL = re.compile(r"([A-Za-z0-9._%+-]+)@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
GENERIC = re.compile(r"^(info|admin|contact|office|media|marketing|reception|general|hello|"
                     r"inquiries|enquiries|cta|tourism|visitor|travel|membership|members|"
                     r"communications|webmaster|noreply|no-reply|support|editor|news|events)$", re.I)
PHONE = re.compile(r"(?<![\d/.-])\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b(?![\d/])")
LOCALPATH = re.compile(r"/home/[a-z]|/tmp/claude|/scratchpad|claude-\d{4}|/root/")
BINARY_MAGIC = (b"%PDF", b"\xd0\xcf\x11\xe0", b"PK\x03\x04", b"\x89PNG", b"\xff\xd8\xff",
                b"GIF8", b"\x1f\x8b", b"7z\xbc\xaf")


def staged():
    out = subprocess.run(["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"],
                         capture_output=True, check=True).stdout
    return [p for p in out.decode().split("\0") if p]


def blob(path):
    return subprocess.run(["git", "show", f":{path}"], capture_output=True, check=True).stdout


def main():
    fails, notes = [], []
    files = staged()
    for p in files:
        data = blob(p)
        if p.startswith("corpus/originals/") and p not in ALLOWED_ORIGINALS:
            fails.append(f"{p}: file under corpus/originals is not allowlisted")
        if FORBIDDEN.search(p):
            fails.append(f"{p}: forbidden path")
        if data.startswith(BINARY_MAGIC):
            fails.append(f"{p}: binary document/image/archive content")
        if len(data) > 10_000_000:
            fails.append(f"{p}: larger than 10 MB ({len(data)} bytes)")
        if p == "scripts/prepublish_check.py":
            continue  # its own pattern definitions would match; path/type/size checks still ran
        text = data.decode("utf-8", "replace")
        for m in SECRET.finditer(text):
            fails.append(f"{p}: possible secret: {m.group(0)[:12]}...")
        for m in EMAIL.finditer(text):
            if not GENERIC.match(m.group(1)):
                fails.append(f"{p}: personal email address: {m.group(0)}")
        for m in PHONE.finditer(text):
            fails.append(f"{p}: phone number: {m.group(0)}")
        for m in LOCALPATH.finditer(text):
            (notes if p.startswith("prompts/") else fails).append(
                f"{p}: local path fragment: {m.group(0)}")
    print(f"staged files checked: {len(files)}")
    for n in notes:
        print("NOTE", n)
    for f in fails:
        print("FAIL", f)
    if fails:
        sys.exit(1)
    print("prepublish check: PASS")


if __name__ == "__main__":
    main()
