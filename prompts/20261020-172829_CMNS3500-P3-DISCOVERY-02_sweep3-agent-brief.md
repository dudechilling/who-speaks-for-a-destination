<!--
Agent instruction record
Task identifier: CMNS3500-P3-DISCOVERY-02, sweep 3
Written: 2026-10-20 17:28:29 UTC by the lead agent (Claude)
Given to: nine delegated review agents (see the dispatch record of the same timestamp)
Content below this comment: the brief, unchanged.
-->

# Agent brief — CMNS3500-P3-DISCOVERY-02, sweep 3 (cross-reference and gap inspection)

Language: short, direct technical English. You are one of several parallel agents.
All paths are relative to `WF=/mnt/current-semester/Fall 2026/CMNS 3500/Assignments/Project 3 - Final Project/Working Files`.

## 1. Read first
- Task prompt: `prompts/20261020-072326_CMNS3500-P3-DISCOVERY-02.md`, sections 7 and 9.
- Scope: `research-design.md`.
- Your packet file(s), named in your dispatch text, in `WF/.discovery_state/sweep3/packets/`. Each entry begins `### <source_id>`. Each line starts with `[p.N]`, the page index of the extracted text (PDF page order, not always the printed page number).
- If a packet line is not enough, you may read the full extracted text, `WF/corpus/derived/text/<source_id>.txt` (pages separated by form feed), or the OCR text `WF/corpus/derived/ocr/<source_id>.txt`. For OCR items, check the relevant line against the page image `WF/corpus/derived/ocr/<source_id>-p-<n>.png` (use the Read tool on the image) before you use it.

## 2. Hard rules
- No network requests are needed for this task. Do not fetch or download anything.
- Write only to your output files in `WF/.discovery_state/sweep3/`. Do not change any other file.
- Do not interpret content. No SFL, no CDA, no judgement of claims. Do not select or rank documents.
- **Do not guess.** A date is established only by evidence in the document: a printed date of issue or publication, a dated signature or letter, a fiscal year stated as the report period, a dated meeting record (minutes, agenda, notice), or a dated news item. A copyright line in a web-page footer, an "updated" line or a URL path is weak evidence: record it as `uncertain`. The archive capture date is never a publication date. If the evidence conflicts, record `uncertain` and quote both.
- Quotations: at most 20 words each, copied exactly from the packet or text. Never invent a quotation or a page number.
- Do not record personal email addresses or phone numbers.

## 3. Tasks

### Task D — dates (packet files `dates_*.md`)
For every entry, write one line to `<PREFIX>_dates.jsonl`:
```
{"source_id": "...",
 "date_status": "verified_in_document | uncertain | not_found | conflicts_with_index",
 "publication_year": "YYYY or empty", "publication_date": "YYYY-MM-DD, YYYY-MM or empty",
 "date_kind": "issue/publication date | fiscal year of report | meeting date | letter/signature date | news item date | event date | other",
 "evidence": "p.N: \"exact quote\"",
 "printed_title": "title exactly as printed on page 1, only if it differs materially from the index title; else empty",
 "note": "short; e.g. 'index year 2009 from filename agrees with printed date' or 'filename year differs from printed year'"}
```
- `verified_in_document`: the document itself states the date, and you quote it.
- `conflicts_with_index`: the document states a different date from the index. Quote it and give the documented value.
- `uncertain`: only weak or conflicting evidence. Quote it, and leave year/date empty unless one value is clearly supported.
- `not_found`: no date evidence in the packet or text.
- For a fiscal-year report (for example 2014/15), set publication_year to the year in which the fiscal year ends, and put the full span in the note.

### Task N — names (packet files `names_*.md`, if named in your dispatch)
Record authors, report signatories, editors, executives (CEO, executive director, general manager, or president used as an executive title) and board chairs, as in DISCOVERY-01 pass two. Do not record ordinary board members or staff lists.
Write one line per name occurrence to `<PREFIX>_authors.jsonl`:
`{"recorded_name": "as printed", "name_type": "author|signatory|editor|executive|board_chair", "documented_variants": "", "search_variants": "generated forms ; separated", "role_at_publication": "as printed", "organization": "as printed", "source_id": "...", "page_or_section": "p.N", "evidence_note": "quote of ≤ 15 words"}`
Do not merge people because their names match. Do not infer identity, Indigenous identity, gender or representation from a name.
Also record any **new organization name or name change** printed in a document (for example "formerly the …") in `<PREFIX>_orgnames.jsonl`:
`{"region": "...", "name": "...", "relation_note": "quote ≤ 20 words", "source_id": "...", "page": "p.N"}`.

### Task R — references (all packet types)
When a document cites another document that is relevant to the three datasets (for example "our 2004–2008 Strategic Plan", "the 1997 annual report", "see the bylaws adopted in 1999"), write a lead to `<PREFIX>_refs.jsonl`:
`{"region": "...", "reference": "title or description as cited", "year_cited": "", "cited_in": "source_id", "page": "p.N", "evidence_quote": "≤ 20 words"}`.
Only record references to documents of the regional organizations, their predecessors, or provincial bodies that govern, fund or evaluate them.

## 4. Finish
Return a report of at most 150 words: counts by date_status, names recorded, organization-name records, references recorded, and problems such as OCR quality.
