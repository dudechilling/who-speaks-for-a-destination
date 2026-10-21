#!/usr/bin/env python3
"""Repair the document links of the corpus review workbook (CMNS3500-P3-DOCS-WORKBOOK-01).

The workbook holds the researcher's screening decisions and notes, so it is edited in
place (never rebuilt from the CSV). Only the CORPUS REVIEW layout and two instruction
texts change. All other sheets, formulas, the decision dropdown, colour rules, tables,
chart, filters and frozen panes are kept.

New CORPUS REVIEW column order (columns are found by their header text in row 5):
    A Review no. | B Source ID | C Open local | D Open online | E Year | F Document title |
    G..O existing screening and decision columns (unchanged, so the dropdown, colour rules
    and the START HERE formulas that point at columns B and I stay valid) |
    P Region (moved) | Q.. the other existing metadata columns |
    then: Original source URL (moved, hyperlink kept), Online link basis (new),
    Local file check (new).

Open local   Relative hyperlink ../corpus/originals/<local_file>, shown only when the file exists
             and its SHA-256 equals the source index. A DUPLICATE row links to the canonical
             file of the row named in duplicate_of. Everything else shows "No local copy".
Open online  Uses source_index.csv evidence only (no new requests):
               original   - the file was retrieved from the original URL (source_class is not
                            wayback_machine); retrieval is the evidence that it worked;
               archive    - the file was retrieved from a Wayback capture; the link is the
                            capture. "verified" when the capture was matched by digest;
               unverified - nothing in the index shows that the address works;
               Unavailable- no address at all.
             An archive capture never replaces an original URL that is known to work.
             Spaces in a new Open online target are written as %20 (the address itself is not
             otherwise changed; the preserved original/archived URL columns are untouched).

researcher cells (decision, dataset, notes) are never written. Source IDs are never changed.

Usage: repair_review_workbook.py --in WORKBOOK --out NEW_WORKBOOK --root WORKING_FILES
                                 [--workbook-location-relative-to-root docs]
"""
import argparse
import collections
import concurrent.futures as cf
import copy
import csv
import hashlib
import json
import os
import re
import sys

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter as L
from openpyxl.worksheet.hyperlink import Hyperlink
from openpyxl.worksheet.table import TableColumn

SHEET = "CORPUS REVIEW"
HDR_ROW, FIRST, = 5, 6
LOCAL_HDR, ONLINE_HDR = "Open local", "Open online"
BASIS_HDR, CHECK_HDR = "Online link basis", "Local file check"
LOCAL_STYLE = dict(head="346D66", fill="E6F1EE", font="1E5A52")        # teal
ORIG_STYLE = dict(head="8A5A12", fill="FBF3E2", font="8A5A12")         # amber
ARCH_STYLE = dict(head="5B4B8A", fill="F1ECF8", font="5B4B8A")         # violet
GREY = "6A736B"
VERIFIED_NOTES = ("Capture verified by digest", "Sweep 4 correction: the retrieved file matches")


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def load_index(root):
    p = os.path.join(root, "corpus", "originals", "source_index.csv")
    with open(p, newline="", encoding="utf-8") as f:
        return {r["source_id"]: r for r in csv.DictReader(f)}


def local_info(idx, root, rel_prefix):
    """Return {source_id: dict(link, text, check, ok)} after verifying files and checksums."""
    odir = os.path.join(root, "corpus", "originals")
    todo = {}
    for sid, r in idx.items():
        if r["acquisition_status"] == "DOWNLOADED" and r["local_file"]:
            todo[sid] = r
    def chk(item):
        sid, r = item
        p = os.path.join(odir, r["local_file"])
        if not os.path.isfile(p):
            return sid, "missing", None
        h = sha256(p)
        return sid, ("ok" if h == r["sha256"] else "checksum_mismatch"), os.path.getsize(p)
    with cf.ThreadPoolExecutor(8) as ex:
        res = {sid: (st, size) for sid, st, size in ex.map(chk, todo.items())}
    out = {}
    for sid, r in idx.items():
        st = r["acquisition_status"]
        if sid in res:
            state, size = res[sid]
            if state == "ok":
                out[sid] = dict(link=f"{rel_prefix}/corpus/originals/{r['local_file']}", text="Open local",
                                check=f"SHA-256 verified against the source index ({size:,} bytes).", ok=True)
            else:
                out[sid] = dict(link=None, text="No local copy",
                                check=f"FILE PROBLEM: {state}. Not linked.", ok=False)
        elif st == "DUPLICATE" and r["duplicate_of"] in res and res[r["duplicate_of"]][0] == "ok":
            c = idx[r["duplicate_of"]]
            out[sid] = dict(link=f"{rel_prefix}/corpus/originals/{c['local_file']}", text="Open local (duplicate)",
                            check=f"Duplicate of {c['source_id']}: links to that row's file; SHA-256 verified "
                                  f"({res[c['source_id']][1]:,} bytes).", ok=True)
        elif st == "DOWNLOADED_INCOMPLETE":
            out[sid] = dict(link=None, text="No local copy",
                            check="An incomplete file exists but is not linked (see Acquisition status).", ok=False)
        else:
            out[sid] = dict(link=None, text="No local copy",
                            check=f"No downloaded copy (acquisition status: {st or 'none'}).", ok=False)
    return out


def online_info(r):
    """Classify the online link for one source-index row from existing evidence."""
    st, cls = r["acquisition_status"], r["source_class"]
    orig, arch = r["original_url"].strip(), r["archive_url"].strip()
    alts = [a.strip() for a in (r["alternate_urls"] or "").split(" | ") if a.strip()]
    notes = r["availability_notes"]
    retrieved = st in ("DOWNLOADED", "DUPLICATE")
    cap = r["archive_capture_date"]
    verified_capture = retrieved and any(m in notes for m in VERIFIED_NOTES)
    if retrieved and cls != "wayback_machine" and orig:
        return dict(kind="original", text="Open online (original)", url=orig,
                    basis=f"Original URL: the discovery crawl retrieved the file from it (retrieval date "
                          f"{r['retrieval_date'] or 'not recorded'}). Not re-tested since.")
    if arch and (retrieved and cls == "wayback_machine"):
        if verified_capture:
            return dict(kind="archive", text="Open online (archive)", url=arch,
                        basis=f"Archived copy, capture {cap or 'date not recorded'}: the local file matches this "
                              "capture by digest. The original URL is not verified; it stays in 'Original source URL'.")
        return dict(kind="archive_unverified", text="Open online (archive, unverified)", url=arch,
                    basis=f"Archived copy, capture {cap or 'date not recorded'}: the file was retrieved from the "
                          "archive but the capture was not matched by digest. The original URL is not verified.")
    if orig:
        return dict(kind="original_unverified", text="Open online (original, unverified)", url=orig,
                    basis="Original URL: not retrieved and not verified (acquisition status "
                          f"{st or 'none'}); it may no longer work." + (" An archive URL exists in 'Archived source URL'." if arch else ""))
    if arch:
        return dict(kind="archive_unverified", text="Open online (archive, unverified)", url=arch,
                    basis=f"Archive URL only; not retrieved or verified (acquisition status {st or 'none'}).")
    if alts:
        return dict(kind="alternate_unverified", text="Open online (alternate, unverified)", url=alts[0],
                    basis="Only an alternate URL is known; not verified.")
    return dict(kind="none", text="Unavailable", url=None, basis="No online address in the source index.")


def style_like(dst, src):
    dst._style = copy.copy(src._style)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--root", required=True, help="Working Files directory")
    ap.add_argument("--rel", default="..", help="path from the workbook folder to Working Files")
    ap.add_argument("--stats", help="write link statistics (JSON) here")
    a = ap.parse_args()
    idx = load_index(a.root)
    wb = openpyxl.load_workbook(a.inp)
    ws = wb[SHEET]
    hdr = {ws.cell(HDR_ROW, c).value: c for c in range(1, ws.max_column + 1) if ws.cell(HDR_ROW, c).value}
    if LOCAL_HDR in hdr:
        sys.exit("workbook already has link columns; run on the original workbook")
    last = ws.max_row
    ids = [ws.cell(r, hdr["Source ID"]).value for r in range(FIRST, last + 1)]
    missing_in_index = [i for i in ids if i not in idx]
    missing_in_book = [i for i in idx if i not in set(ids)]
    if missing_in_index or missing_in_book or len(ids) != len(set(ids)):
        sys.exit(f"source ID mismatch: not in index {missing_in_index[:5]}, not in workbook {missing_in_book[:5]}")
    loc = local_info(idx, a.root, a.rel)
    on = {sid: online_info(idx[sid]) for sid in ids}

    # --- snapshot the existing sheet (values, styles, hyperlinks) -------------------------
    old_cols = list(range(1, ws.max_column + 1))
    snap = {}
    for r in range(HDR_ROW, last + 1):
        for c in old_cols:
            cell = ws.cell(r, c)
            snap[(r, c)] = (cell.value, copy.copy(cell._style),
                            copy.copy(cell.hyperlink) if cell.hyperlink else None)
    widths = {c: ws.column_dimensions[L(c)].width for c in old_cols}
    h = lambda name: hdr[name]
    order_old = ["Review no.", "Source ID", LOCAL_HDR, ONLINE_HDR, "Year", "Document title"]
    meta_old = [n for n in sorted(hdr, key=hdr.get)
                if n not in order_old and n not in ("Original source URL", "Region")]
    # screening/decision block = existing columns G..O; metadata block starts at "Acquisition status"
    split = meta_old.index("Acquisition status")
    layout = (order_old + meta_old[:split] + ["Region"] + meta_old[split:] +
              ["Original source URL", BASIS_HDR, CHECK_HDR])
    ncols = len(layout)

    # --- clear the old block, then write the new layout ------------------------------------
    for r in range(HDR_ROW, last + 1):
        for c in range(1, max(ncols, ws.max_column) + 1):
            cell = ws.cell(r, c)
            cell.hyperlink = None
            cell.value = None
    ref_cell = ws.cell(FIRST, hdr["Document title"])  # a plain text data cell, for new columns
    hdr_ref = ws.cell(HDR_ROW, 1)
    for ci, name in enumerate(layout, 1):
        if name in hdr:                                             # moved or kept column
            oc = hdr[name]
            for r in range(HDR_ROW, last + 1):
                v, sty, hl = snap[(r, oc)]
                cell = ws.cell(r, ci)
                cell.value = v
                cell._style = copy.copy(sty)
                if hl is not None:
                    cell.hyperlink = Hyperlink(ref=cell.coordinate, target=hl.target, location=hl.location,
                                               tooltip=hl.tooltip, display=hl.display)
            ws.column_dimensions[L(ci)].width = widths[oc]
        else:                                                       # new column
            hc = ws.cell(HDR_ROW, ci)
            hc.value = name
            hc._style = copy.copy(snap[(HDR_ROW, 1)][1])
            if name in (LOCAL_HDR, ONLINE_HDR):
                s = LOCAL_STYLE if name == LOCAL_HDR else ORIG_STYLE
                hc.fill = PatternFill("solid", fgColor=s["head"])
                ws.column_dimensions[L(ci)].width = 19 if name == LOCAL_HDR else 33
            else:
                ws.column_dimensions[L(ci)].width = 70 if name == BASIS_HDR else 60
    # the Region header/style for the moved column keep their old styles (copied above)

    col = {n: i for i, n in enumerate(layout, 1)}
    base_style = snap[(FIRST, hdr["Document title"])][1]
    stats = collections.Counter()
    for r in range(FIRST, last + 1):
        sid = ws.cell(r, col["Source ID"]).value
        lc, oc = loc[sid], on[sid]
        # Open local
        c1 = ws.cell(r, col[LOCAL_HDR])
        c1._style = copy.copy(base_style)
        c1.value = lc["text"]
        c1.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        if lc["link"]:
            c1.hyperlink = Hyperlink(ref=c1.coordinate, target=lc["link"],
                                     tooltip=f"Opens the downloaded original ({lc['link']})")
            c1.fill = PatternFill("solid", fgColor=LOCAL_STYLE["fill"])
            c1.font = Font(name="Aptos", sz=10, u="single", color=LOCAL_STYLE["font"])
            stats["local_valid"] += 1
            stats["local_duplicate"] += lc["text"].endswith("(duplicate)")
        else:
            c1.font = Font(name="Aptos", sz=10, i=True, color=GREY)
            stats["no_local"] += 1
            stats["local_problem"] += lc["check"].startswith("FILE PROBLEM")
        # Open online
        c2 = ws.cell(r, col[ONLINE_HDR])
        c2._style = copy.copy(base_style)
        c2.value = oc["text"]
        c2.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        stats["online_" + oc["kind"]] += 1
        if oc["url"]:
            kind = oc["kind"]
            st = ORIG_STYLE if kind.startswith("original") else ARCH_STYLE
            c2.hyperlink = Hyperlink(ref=c2.coordinate, target=oc["url"].replace(" ", "%20"), tooltip=oc["text"])
            c2.fill = PatternFill("solid", fgColor=st["fill"])
            c2.font = Font(name="Aptos", sz=10, u="single", i=kind.endswith("unverified"), color=st["font"])
        else:
            c2.font = Font(name="Aptos", sz=10, i=True, color=GREY)
        ws.cell(r, col[BASIS_HDR]).value = oc["basis"]
        ws.cell(r, col[CHECK_HDR]).value = lc["check"]
        for name in (BASIS_HDR, CHECK_HDR):
            cell = ws.cell(r, col[name])
            cell._style = copy.copy(base_style)
    # the table keeps its name and style; its range and columns follow the new layout
    t = ws.tables["CorpusReviewTable"]
    t.ref = f"A{HDR_ROW}:{L(ncols)}{last}"
    t.autoFilter.ref = t.ref
    t.tableColumns = [TableColumn(id=i, name=n) for i, n in enumerate(layout, 1)]
    old_last = max(old_cols)
    for mr in list(ws.merged_cells.ranges):          # title and note banners: widen to the new last column
        if mr.min_row in (1, 3):
            top, bottom = mr.min_row, mr.max_row
            ws.unmerge_cells(str(mr))
            for rr in range(top, bottom + 1):
                for cc in range(old_last + 1, ncols + 1):
                    ws.cell(rr, cc)._style = copy.copy(ws.cell(rr, old_last)._style)
            ws.merge_cells(start_row=top, start_column=1, end_row=bottom, end_column=ncols)
    ws.freeze_panes = f"E{FIRST}"
    # --- instruction texts that named the old columns --------------------------------------
    a3 = ws["A3"]
    if a3.value and "column C" in a3.value:
        a3.value = ("Blue columns are reserved for your decisions. Column C opens the downloaded original and "
                    "column D opens the online source (original, archive or unverified, as labelled). Filter "
                    "column G = YES - REVIEW FIRST for the 307 priority candidates. None is approved.")
    sh = wb["START HERE"]
    for row in sh.iter_rows():
        for cell in row:
            if isinstance(cell.value, str) and cell.value.startswith("1. Open CORPUS REVIEW. Click the source URLs in column C."):
                cell.value = ("1. Open CORPUS REVIEW. Click Open local (column C) to open the downloaded original, and "
                              "Open online (column D) for the web source: original site, archive copy or unverified, as "
                              "labelled. Filter column G = YES - REVIEW FIRST to inspect the 307 priority candidates. "
                              "These are not approved texts.")
                sh.row_dimensions[cell.row].height = max(sh.row_dimensions[cell.row].height or 15, 45)
    wb.save(a.out)
    res = dict(stats)
    res.update(rows=len(ids), columns=ncols, layout=layout)
    if a.stats:
        json.dump(res, open(a.stats, "w"), indent=1)
    print(json.dumps({k: v for k, v in res.items() if k != "layout"}, indent=1))


if __name__ == "__main__":
    main()
