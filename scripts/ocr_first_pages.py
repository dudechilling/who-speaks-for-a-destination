#!/usr/bin/env python3
"""Selective OCR of the first pages of PDFs that have no text layer (sweep 3).

Purpose: help establish titles, dates and source metadata only. The original files
are not changed. Page images and OCR text are written to corpus/derived/ocr/
(local only, never published):
    <source_id>-p-<n>.png   page image (longest side <= 2000 px)
    <source_id>.txt         OCR text, pages separated by form feed, each page headed
                            "<<page image <file>>>" so a reviewer can check it against the image.

Input: a file with one source_id per line (default .discovery_state/notext_ids.txt).
Usage: python3 -I scripts/ocr_first_pages.py [--ids FILE] [--pages 2] [--workers 4]
"""
import argparse
import concurrent.futures as cf
import csv
import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
O = os.path.join(ROOT, "corpus", "originals")
D = os.path.join(ROOT, "corpus", "derived", "ocr")


def ocr(row, pages):
    sid = row["source_id"]
    out = os.path.join(D, sid + ".txt")
    if os.path.exists(out):
        return sid, "already done"
    src = os.path.join(O, row["local_file"])
    try:
        subprocess.run(["pdftoppm", "-f", "1", "-l", str(pages), "-scale-to", "2000", "-png",
                        src, os.path.join(D, sid + "-p")], capture_output=True, timeout=600)
    except subprocess.TimeoutExpired:
        return sid, "render timeout"
    imgs = sorted(f for f in os.listdir(D) if f.startswith(sid + "-p-") and f.endswith(".png"))
    parts, status = [], "ok"
    env = dict(os.environ, OMP_THREAD_LIMIT="1")
    for f in imgs:
        try:
            t = subprocess.run(["tesseract", os.path.join(D, f), "-", "-l", "eng"],
                               capture_output=True, text=True, timeout=300, env=env).stdout
        except subprocess.TimeoutExpired:
            t, status = "[OCR timeout]", "partial"
        parts.append(f"<<page image {f}>>\n{t}")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write("\f".join(parts))
    return sid, status if imgs else "no page image"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", default=os.path.join(ROOT, ".discovery_state", "notext_ids.txt"))
    ap.add_argument("--pages", type=int, default=2)
    ap.add_argument("--workers", type=int, default=4)
    a = ap.parse_args()
    os.makedirs(D, exist_ok=True)
    ids = set(open(a.ids).read().split())
    rows = [r for r in csv.DictReader(open(os.path.join(O, "source_index.csv"), encoding="utf-8"))
            if r["source_id"] in ids and r["local_file"]]
    with cf.ThreadPoolExecutor(a.workers) as ex:
        for sid, st in ex.map(lambda r: ocr(r, a.pages), rows):
            print(st, sid, flush=True)


if __name__ == "__main__":
    main()
