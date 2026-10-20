#!/usr/bin/env python3
"""Cumulative coverage assessment of the discovery register (CMNS3500-P3-DISCOVERY-02).

Reads corpus/originals/source_index.csv and writes a Markdown coverage assessment.
Groupings are computed for this report only. They are not written back to the index.

- Document-type group: keyword mapping of the free-text document_type onto the
  document-type list of the task prompt (section 6).
- Proposed dataset (A language, B governance, C performance): keyword mapping onto
  the three datasets of research-design.md. A document can map to several datasets.
  This mapping is a PROVISIONAL coverage heuristic. It is not a coding decision,
  not a sampling decision and not an inclusion decision.
- Period: five-year bins of the evidenced publication_year; "unknown" when no year
  is evidenced. Wayback capture dates are never used.

Usage: python3 -I scripts/coverage_report.py [--out PATH] [--title TEXT]
"""
import argparse
import collections
import csv
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TYPE_GROUPS = [  # (group, regex on document_type + title), first match wins
    ("Annual report", r"annual report|year in review|impact report"),
    ("Financial statements / financial report", r"financ|audit|statement of financial"),
    ("Service plan / service plan report", r"service plan"),
    ("Business plan / budget", r"business plan|budget"),
    ("Strategic plan", r"strategic plan|strategic framework|corporate strategy"),
    ("Destination development / management strategy", r"destination (development|management)|"
                                                       r"regional tourism strateg|tourism strateg|"
                                                       r"development strateg"),
    ("Marketing plan", r"marketing plan|mrdt|marketing strateg"),
    ("Board roster / biographies", r"roster|board biograph|board list|director bio|board bio|"
                                   r"directors? page"),
    ("Board election / appointment", r"election|nomination|appointment|voting"),
    ("Board / AGM minutes", r"minutes"),
    ("AGM report / notice / package", r"\bagm\b|annual general meeting"),
    ("Bylaws / constitution / membership rules", r"bylaw|constitution|membership"),
    ("Governance framework / policy", r"governance|policy manual|board polic"),
    ("Funding agreement / contract", r"agreement|contract|shared cost|mou"),
    ("Performance / research report", r"performance|research|survey|visitor (view|statistics)|"
                                      r"str report|evaluation|impact|profile|statistics"),
    ("Sustainability / stewardship report", r"sustainab|stewardship|climate|insto|observatory"),
    ("Newsletter", r"newsletter|ceo update|e-?news"),
    ("Government record (Hansard, correspondence, mandate)", r"hansard|correspondence|mandate|"
                                                             r"letter of expectation|news release"),
    ("News / press item", r"news|press|media release|article"),
    ("Visitor guide / brochure", r"visitor guide|travel guide|brochure"),
    ("Other institutional publication", r"."),
]
DATASETS = {
    "A (language)": r"annual report|strateg|business plan|service plan|corporate report|"
                    r"development|management plan|marketing plan|newsletter|ceo|message|"
                    r"institutional publication|year in review|impact report|sustainab|"
                    r"stewardship|mission|vision|about|organization (profile|description)",
    "B (governance)": r"board|agm|annual general meeting|minutes|bylaw|constitution|"
                      r"membership|governance|election|nomination|appointment|voting|director",
    "C (performance)": r"annual report|financ|audit|service plan|performance|research|survey|"
                       r"evaluation|impact|statistic|indicator|target|mrdt|business plan|budget|"
                       r"sustainab|stewardship|agreement|contract|year in review",
}
LINEAGE = [
    ("Vancouver Island: TAVI / Tourism Vancouver Island / 4VI", r"vancouver island|4vi|tavi"),
    ("Thompson Okanagan: TOTA (and predecessors)", r"thompson okanagan|okanagan|tota"),
    ("Kootenay Rockies: KRT (and predecessors)", r"kootenay|rockies|krt"),
    ("Northern BC: NBCTA (and predecessors)", r"northern|nbcta"),
    ("Yellowhead Travel Association (relation to NBCTA not evidenced)", r"yellowhead"),
    ("Cariboo Chilcotin Coast: CCCTA / CCCTMA (and predecessors)", r"cariboo"),
    ("Provincial: Destination BC / Tourism BC / ministries", r"destination bc|tourism british|"
                                                             r"ministry|provincial"),
    ("Several regional organizations", r"regional tourism organizations"),
]
REGIONS = ["Vancouver_Island", "Thompson_Okanagan", "Kootenay_Rockies", "Northern_BC",
           "Cariboo_Chilcotin_Coast", "Multi_Region"]
STATUSES = ["DOWNLOADED", "DOWNLOADED_INCOMPLETE", "DUPLICATE", "METADATA_ONLY", "UNAVAILABLE",
            "ACCESS_RESTRICTED", "DOWNLOAD_FAILED"]


def type_group(r):
    t = f"{r['document_type']} {r['document_title']}".lower()
    for g, rx in TYPE_GROUPS:
        if re.search(rx, t):
            return g
    return "Other institutional publication"


def datasets(r):
    t = f"{r['document_type']} {r['document_title']}".lower()
    return [d for d, rx in DATASETS.items() if re.search(rx, t)] or ["unassigned"]


def lineage(r):
    t = r["organization"].lower()
    for g, rx in LINEAGE:
        if re.search(rx, t):
            return g
    return "Other / unclear"


def period(r):
    y = (r["publication_year"] or "")[:4]
    if not y.isdigit():
        return "unknown"
    y = int(y)
    if y < 1985:
        return "before 1985"
    lo = y - (y - 1985) % 5
    return f"{lo}–{min(lo + 4, 2026)}"


def is_dl(r):
    return r["acquisition_status"] == "DOWNLOADED"


def table(title, keys, rows, keyf, multi=False):
    out = [f"### {title}", "",
           "| " + title.split(" by ")[-1].capitalize() + " | Candidates | Downloaded (complete) | "
           "Not downloaded | Incomplete |", "|---|---|---|---|---|"]
    c = collections.Counter()
    d = collections.Counter()
    inc = collections.Counter()
    for r in rows:
        ks = keyf(r) if multi else [keyf(r)]
        for k in ks:
            c[k] += 1
            d[k] += is_dl(r)
            inc[k] += r["acquisition_status"] == "DOWNLOADED_INCOMPLETE"
    order = keys or [k for k, _ in c.most_common()]
    for k in order:
        if c[k]:
            out.append(f"| {k} | {c[k]} | {d[k]} | {c[k] - d[k] - inc[k]} | {inc[k]} |")
    return out + [""]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, "results", "discovery_sweeps",
                                                  "coverage_assessment.md"))
    ap.add_argument("--title", default="Cumulative coverage assessment")
    ap.add_argument("--note", default="")
    a = ap.parse_args()
    rows = list(csv.DictReader(open(os.path.join(ROOT, "corpus", "originals", "source_index.csv"),
                                    encoding="utf-8")))
    periods = ["before 1985"] + [f"{y}–{min(y + 4, 2026)}" for y in range(1985, 2026, 5)] + ["unknown"]
    L = [f"# {a.title}", "",
         "Generated by `scripts/coverage_report.py` from `corpus/originals/source_index.csv`.",
         a.note, "",
         "**Reading rules.** Every row is a *candidate*. No document is researcher-approved "
         "(all `include` cells are blank). \"Downloaded\" means a complete original is held on the "
         "m710. It does not mean that the document is relevant or comparable. Periods use the "
         "evidenced publication year only; Wayback capture dates are never used. The document-type "
         "groups and dataset mapping are provisional keyword heuristics for coverage reporting. "
         "They are not coding, sampling or inclusion decisions.", "",
         f"Total candidates: **{len(rows)}**. Downloaded (complete): "
         f"**{sum(map(is_dl, rows))}**.", ""]
    L += table("Coverage by region", REGIONS, rows, lambda r: r["region"])
    L += table("Coverage by organization lineage", None, rows, lineage)
    L += table("Coverage by historical period", periods, rows, period)
    L += table("Coverage by document-type group", None, rows, type_group)
    L += table("Coverage by proposed dataset (provisional mapping; multi-membership)",
               list(DATASETS) + ["unassigned"], rows, datasets, multi=True)
    st = collections.Counter(r["acquisition_status"] for r in rows)
    L += ["### Coverage by acquisition status", "", "| Status | Rows |", "|---|---|"]
    L += [f"| {s} | {st[s]} |" for s in STATUSES + sorted(set(st) - set(STATUSES)) if st[s]] + [""]
    mc = collections.Counter(r["metadata_confidence"] or "(blank)" for r in rows)
    L += ["### Coverage by metadata confidence", "", "| Confidence | Rows | Downloaded |",
          "|---|---|---|"]
    L += [f"| {k} | {v} | {sum(1 for r in rows if (r['metadata_confidence'] or '(blank)') == k and is_dl(r))} |"
          for k, v in mc.most_common()] + [""]
    # region x period matrix for the regional organizations (downloaded / candidates)
    L += ["### Region × period (downloaded complete / all candidates)", "",
          "| Period | " + " | ".join(REGIONS) + " |", "|---" * (len(REGIONS) + 1) + "|"]
    for p in periods:
        cells = []
        for g in REGIONS:
            sel = [r for r in rows if r["region"] == g and period(r) == p]
            cells.append(f"{sum(map(is_dl, sel))} / {len(sel)}" if sel else "—")
        L.append(f"| {p} | " + " | ".join(cells) + " |")
    L += ["", "### Region × dataset, 1985–1999 only (downloaded complete / all candidates)", "",
          "| Region | " + " | ".join(DATASETS) + " |", "|---" * (len(DATASETS) + 1) + "|"]
    for g in REGIONS:
        cells = []
        for d in DATASETS:
            sel = [r for r in rows if r["region"] == g and d in datasets(r) and
                   period(r) not in ("unknown", "before 1985") and int(period(r)[:4]) < 2000]
            cells.append(f"{sum(map(is_dl, sel))} / {len(sel)}" if sel else "—")
        L.append(f"| {g} | " + " | ".join(cells) + " |")
    L.append("")
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        f.write("\n".join(L))
    print(a.out)


if __name__ == "__main__":
    main()
