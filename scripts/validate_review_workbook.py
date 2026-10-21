#!/usr/bin/env python3
"""Validate a repaired corpus review workbook against the original (CMNS3500-P3-DOCS-WORKBOOK-01).

Reopens both workbooks and checks:
  1  all candidate records remain and the Source ID order is identical;
  2  every preserved cell (all columns the repair kept) has an identical value;
  3  researcher cells (decision, dataset, notes) are identical, row by row, by Source ID;
  4  every local hyperlink resolves, from the workbook's own folder, to an existing file whose
     SHA-256 equals the source index;  rows without a local link say "No local copy";
  5  every online hyperlink equals original_url or archive_url (or an alternate) of its index row,
     and the label matches the evidence class (original vs archive vs unverified);
  6  the existing hyperlinks (original and archived URL columns) are unchanged;
  7  formulas on all sheets are identical text;  the START HERE formulas still point at columns
     B and I of CORPUS REVIEW, which still hold Source ID and the decision;
  8  decision dropdown (list INCLUDE,EXCLUDE,HOLD on the decision column), colour rules, table
     name/range/header match, frozen panes, filters, print titles;
  9  all other sheets keep identical values and hyperlinks; the chart is still present;
 10  the package is well-formed (zip test, every XML part parses, content types).

Usage: validate_review_workbook.py --old ORIGINAL.xlsx --new REPAIRED.xlsx --root WORKING_FILES
                                   --folder PATH_OF_THE_FOLDER_HOLDING_THE_NEW_WORKBOOK
"""
import argparse
import collections
import csv
import hashlib
import json
import os
import sys
import zipfile

import openpyxl
from lxml import etree

SHEET = "CORPUS REVIEW"
RESEARCHER = ["YOUR FINAL DECISION", "FINAL DATASET(S)", "YOUR NOTES", "Recommend advancing?",
              "Screening recommendation"]


def sha256(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def headers(ws):
    return {ws.cell(5, c).value: c for c in range(1, ws.max_column + 1) if ws.cell(5, c).value}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--old", required=True)
    ap.add_argument("--new", required=True)
    ap.add_argument("--root", required=True)
    ap.add_argument("--folder", required=True, help="folder that holds the new workbook (links resolve from it)")
    a = ap.parse_args()
    R, bad = {}, []
    def check(name, ok, detail=""):
        R[name] = {"pass": bool(ok), "detail": detail}
        if not ok:
            bad.append(name)

    with open(os.path.join(a.root, "corpus", "originals", "source_index.csv"), newline="", encoding="utf-8") as f:
        idx = {r["source_id"]: r for r in csv.DictReader(f)}
    wo, wn = openpyxl.load_workbook(a.old), openpyxl.load_workbook(a.new)
    check("sheets_same", wo.sheetnames == wn.sheetnames, str(wn.sheetnames))
    so, sn = wo[SHEET], wn[SHEET]
    ho, hn = headers(so), headers(sn)
    last_o, last_n = so.max_row, sn.max_row
    ids_o = [so.cell(r, ho["Source ID"]).value for r in range(6, last_o + 1)]
    ids_n = [sn.cell(r, hn["Source ID"]).value for r in range(6, last_n + 1)]
    check("record_count", len(ids_n) == len(ids_o) == 1972 == len(idx), f"{len(ids_o)} -> {len(ids_n)}; index {len(idx)}")
    check("source_ids_identical_in_order", ids_o == ids_n)
    check("ids_match_index", set(ids_n) == set(idx))
    # 2/3 preserved cells
    kept = [h for h in ho if h in hn and h not in ("Open local", "Open online")]
    diff = []
    for h in kept:
        for r in range(6, last_o + 1):
            if so.cell(r, ho[h]).value != sn.cell(r, hn[h]).value:
                diff.append((h, r))
    check("preserved_columns_identical", not diff, f"{len(kept)} columns compared, {len(diff)} differences {diff[:3]}")
    check("all_old_columns_kept", set(ho) <= set(hn), str(sorted(set(ho) - set(hn))))
    rr = [h for h in RESEARCHER if h in hn]
    nz = {h: sum(1 for r in range(6, last_n + 1) if sn.cell(r, hn[h]).value not in (None, "")) for h in rr}
    nz_old = {h: sum(1 for r in range(6, last_o + 1) if so.cell(r, ho[h]).value not in (None, "")) for h in rr}
    check("researcher_cells_unchanged", all(
        so.cell(r, ho[h]).value == sn.cell(r, hn[h]).value for h in rr for r in range(6, last_o + 1)),
        f"non-empty cells before {nz_old}, after {nz}")
    # 4 local links
    folder = a.folder
    nlocal = nnolocal = dup = 0
    problems = []
    for r in range(6, last_n + 1):
        sid = sn.cell(r, hn["Source ID"]).value
        c = sn.cell(r, hn["Open local"])
        ir = idx[sid]
        if c.hyperlink is not None:
            tgt = c.hyperlink.target
            p = os.path.normpath(os.path.join(folder, tgt))
            if not tgt.startswith("../corpus/originals/") or " " in tgt or "\\" in tgt:
                problems.append((sid, "bad link form", tgt)); continue
            if not os.path.isfile(p):
                problems.append((sid, "missing file", tgt)); continue
            canon = ir if ir["acquisition_status"] == "DOWNLOADED" else idx.get(ir["duplicate_of"], {})
            want = canon.get("local_file")
            if tgt != f"../corpus/originals/{want}":
                problems.append((sid, "link does not match index local_file", tgt)); continue
            if sha256(p) != canon.get("sha256"):
                problems.append((sid, "checksum mismatch", tgt)); continue
            nlocal += 1
            dup += ir["acquisition_status"] == "DUPLICATE"
        else:
            if c.value != "No local copy":
                problems.append((sid, "no link but label", c.value))
            nnolocal += 1
    check("local_links_resolve_and_checksums_match", not problems and nlocal + nnolocal == 1972,
          f"{nlocal} valid ({dup} via duplicate), {nnolocal} 'No local copy', problems {problems[:3]}")
    # 5 online links
    kinds = collections.Counter(); oprob = []
    for r in range(6, last_n + 1):
        sid = sn.cell(r, hn["Source ID"]).value
        ir = idx[sid]
        c = sn.cell(r, hn["Open online"])
        t = c.hyperlink.target if c.hyperlink is not None else None
        enc = lambda u: u.strip().replace(" ", "%20")   # the repair writes spaces as %20
        allowed = {enc(ir["original_url"]): "original", enc(ir["archive_url"]): "archive"}
        for x in (ir["alternate_urls"] or "").split(" | "):
            if x.strip():
                allowed.setdefault(enc(x), "alternate")
        label = c.value or ""
        if t is None:
            kinds["no link"] += 1
            if label != "Unavailable":
                oprob.append((sid, "no link but label", label))
            continue
        if t not in allowed:
            oprob.append((sid, "target not in the source index", t)); continue
        want = allowed[t]
        if want == "original" and "original" not in label or want == "archive" and "archive" not in label:
            oprob.append((sid, "label/target mismatch", label)); continue
        if "archive" in label and "web.archive.org" not in t and "archive.org" not in t:
            oprob.append((sid, "archive label on a non-archive URL", t)); continue
        kinds[label] += 1
    check("online_links_trace_to_index", not oprob, f"{dict(kinds)} problems {oprob[:3]}")
    # 6 existing hyperlinks preserved
    def links(ws, hdrs, name):
        out = {}
        for r in range(6, ws.max_row + 1):
            c = ws.cell(r, hdrs[name])
            if c.hyperlink is not None:
                out[ws.cell(r, hdrs["Source ID"]).value] = c.hyperlink.target
        return out
    for name in ("Original source URL", "Archived source URL"):
        lo, ln = links(so, ho, name), links(sn, hn, name)
        check(f"hyperlinks_kept_{name}", lo == ln, f"{len(lo)} before, {len(ln)} after")
    # 7 formulas
    fo = {(s.title, c.coordinate): c.value for s in wo.worksheets for row in s.iter_rows() for c in row
          if isinstance(c.value, str) and c.value.startswith("=")}
    fn = {(s.title, c.coordinate): c.value for s in wn.worksheets for row in s.iter_rows() for c in row
          if isinstance(c.value, str) and c.value.startswith("=")}
    check("formulas_identical", fo == fn, f"{len(fo)} formulas")
    check("formula_targets_still_valid", hn["Source ID"] == 2 and hn["YOUR FINAL DECISION"] == 9 and
          sn.max_row == 1977 and all("$I$6:$I$1977" in v or "$B$6:$B$1977" in v for v in fn.values() if "CORPUS REVIEW" in v),
          f"Source ID col {hn['Source ID']}, decision col {hn['YOUR FINAL DECISION']}, last row {sn.max_row}")
    # 8 validation / formatting / table
    dv = [(str(d.sqref), d.type, d.formula1) for d in sn.data_validations.dataValidation]
    dcol = openpyxl.utils.get_column_letter(hn["YOUR FINAL DECISION"])
    check("dropdown", dv == [(f"{dcol}6:{dcol}1977", "list", '"INCLUDE,EXCLUDE,HOLD"')], str(dv))
    cfo = [(str(k.sqref), [(r.type, r.formula, r.operator) for r in v]) for k, v in so.conditional_formatting._cf_rules.items()]
    cfn = [(str(k.sqref), [(r.type, r.formula, r.operator) for r in v]) for k, v in sn.conditional_formatting._cf_rules.items()]
    check("colour_rules", cfo == cfn, str(cfn)[:120])
    t = sn.tables["CorpusReviewTable"]
    heads = [sn.cell(5, c).value for c in range(1, sn.max_column + 1)]
    check("table", t.ref == f"A5:{openpyxl.utils.get_column_letter(sn.max_column)}{last_n}" and
          [c.name for c in t.tableColumns] == heads and t.autoFilter is not None and t.autoFilter.ref == t.ref,
          f"{t.ref}, {len(heads)} columns, filter {t.autoFilter.ref if t.autoFilter else None}")
    check("frozen_panes", sn.freeze_panes == "E6", str(sn.freeze_panes))
    check("print_titles", sn.print_title_rows == so.print_title_rows, str(sn.print_title_rows))
    check("column_order", heads[:6] == ["Review no.", "Source ID", "Open local", "Open online", "Year", "Document title"],
          str(heads[:7]))
    # 9 other sheets
    other = []
    for s_o in wo.worksheets:
        if s_o.title == SHEET:
            continue
        s_n = wn[s_o.title]
        for row in s_o.iter_rows():
            for c in row:
                d = s_n[c.coordinate]
                if c.value != d.value or (c.hyperlink.target if c.hyperlink else None) != (d.hyperlink.target if d.hyperlink else None):
                    other.append((s_o.title, c.coordinate))
    start_changed = sorted({coord for t_, coord in other if t_ == "START HERE"})
    check("other_sheets_unchanged", not [x for x in other if x[0] != "START HERE"],
          f"START HERE cells with updated instructions: {start_changed}")
    check("chart_kept", len(wn["COVERAGE"]._charts) == len(wo["COVERAGE"]._charts) == 1)
    check("all_tables_kept", {k for s in wo.worksheets for k in s.tables} == {k for s in wn.worksheets for k in s.tables})
    # 10 package
    z = zipfile.ZipFile(a.new)
    check("zip_ok", z.testzip() is None)
    try:
        n = 0
        for name in z.namelist():
            if name.endswith((".xml", ".rels")):
                etree.fromstring(z.read(name)); n += 1
        check("xml_parts_wellformed", True, f"{n} parts")
    except Exception as e:  # noqa: BLE001
        check("xml_parts_wellformed", False, str(e))
    ct = z.read("[Content_Types].xml").decode()
    check("content_types", all(x in ct for x in ("worksheet+xml", "table+xml", "drawing+xml", "chart+xml")))
    print(json.dumps({"failed": bad, "results": R}, indent=1, ensure_ascii=False))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
