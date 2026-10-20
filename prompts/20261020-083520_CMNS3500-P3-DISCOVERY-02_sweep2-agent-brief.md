<!--
Agent instruction record
Task identifier: CMNS3500-P3-DISCOVERY-02, sweep 2
Written: 2026-10-20 08:35:20 UTC by the lead agent (Claude)
Given to: six delegated discovery agents (see the dispatch record of the same timestamp)
Content below this comment: the brief, unchanged.
-->

# Agent brief — CMNS3500-P3-DISCOVERY-02, sweep 2 (historical archive search)

Language: short, direct technical English. You are one of several parallel agents.

## 1. Read first
- Task prompt: `prompts/20261020-072326_CMNS3500-P3-DISCOVERY-02.md` (sections 4, 6, 9 and the publication restrictions).
- Scope: `research-design.md`.
- Earlier results: `results/discovery_summary.md` (§4 names, §5 gaps, §8 unresolved leads).
- Register (read only): `corpus/originals/source_index.csv`.
- Earlier search logs: `results/discovery_records/pass1/*_searchlog.jsonl` and `pass2/*_searchlog.jsonl`. Do not repeat a failed search without a reason to expect a different result. Write the reason in your log.

All paths are relative to `WF=/mnt/current-semester/Fall 2026/CMNS 3500/Assignments/Project 3 - Final Project/Working Files`.

## 2. Hard rules
- Discovery only. Do not download documents. Do not write any file in WF except in your output directory: `WF/.discovery_state/sweep2/`.
- For every HTTP request to a website or archive use only:
  ```
  export POLITE_STATE_DIR="$WF/.discovery_state/polite"
  python3 -I -B "$WF/scripts/polite_fetch.py" 'URL'            # text body to stdout, status JSON to stderr
  python3 -I -B "$WF/scripts/polite_fetch.py" --max-bytes 4096 'URL'   # sniff a binary file
  ```
  It enforces one request per host, ≥ 2 s between requests (4 s for archive.org), robots.txt, 429/Retry-After and stop-on-403. Do not use WebFetch, curl or wget. The WebSearch tool is allowed.
- Do not bypass logins, paywalls, CAPTCHAs, bot challenges or access controls. Do not retry a host that denied access. Record the denial.
- Do not assume that a historical tourism *region* and a similarly named *organization* are the same entity. Record evidence (URL and short quote) for any proposed succession or name change.
- Never use a Wayback capture date as a publication date. Leave unknown values empty. Do not guess.
- Do not interpret content. No SFL, no CDA, no judgement of stewardship or governance claims.
- Do not record personal email addresses or phone numbers.

## 3. Focus
Missing years, especially **1985–1998**, then 1999–2012 gaps. Search for: annual reports, strategic plans, business plans, board records (rosters, elections, AGM minutes), governance documents (bylaws, constitutions), financial statements, executive statements, reported performance measures.
Use combinations of: organization name and every documented historical variant (see `discovery_summary.md` §4), period/year, author or officer names (`corpus/originals/authors_public.csv`), document title, document type.
Source classes: official sites; archived sites (Wayback CDX by domain and path); government publications and agreements; BC Hansard and sessional papers; library and archival catalogues (record catalogue-only items as METADATA_ONLY with call number / holding library); regional district records (board minutes and agendas that name the association, grants, delegations); historical newspapers and public indexes (record article-level leads; OCR text pages are acceptable fetch targets); titles and references cited inside earlier reports.

## 4. Outputs (JSON Lines, UTF-8) in `WF/.discovery_state/sweep2/`
1. `<PREFIX>_candidates.jsonl` — one object per NEW distinct candidate (check `original_url`, `archive_url` and `alternate_urls` in source_index.csv first; a repeated hit is not new). Use exactly this format:
   ```
   {"region": "Vancouver_Island|Thompson_Okanagan|Kootenay_Rockies|Northern_BC|Cariboo_Chilcotin_Coast|Multi_Region",
    "organization": "...", "organization_name_at_publication": "", "document_title": "", "title_basis": "printed|listing_link_text|catalogue_record|filename",
    "publication_year": "", "publication_date": "", "date_evidence": "",
    "document_type": "type name from the task list (prompt DISCOVERY-01 §6)", "author_or_signatory": "", "issuing_body": "",
    "source_class": "official_sites|wayback_machine|government_archives|library_archives|other_public_sources",
    "original_url": "", "archive_url": "", "archive_capture_timestamp": "", "alternate_urls": [],
    "fetch_url": "URL to download (Wayback: .../web/<ts>id_/<url>); empty if none",
    "acquisition_target": "DOWNLOAD|METADATA_ONLY|UNAVAILABLE|ACCESS_RESTRICTED",
    "size_bytes_if_known": "", "metadata_confidence": "HIGH|MEDIUM|LOW",
    "availability_notes": "", "found_by": "sweep 2: <query or path>", "slug": "Short_Title_Case"}
   ```
2. `<PREFIX>_searchlog.jsonl` — one object per search action, including empty and failed ones:
   `{"date": "YYYY-MM-DD", "sweep": 2, "platform": "...", "query_or_url": "...", "returned_locations": ["up to 5 URLs"], "result": "short", "usable": true|false, "retrieval_outcome": "candidate recorded|already indexed|nothing relevant|access denied|error"}`
3. `<PREFIX>_leads.jsonl` — unresolved references (a document cited somewhere but not located, a catalogue record without access, an archive fonds needing a visit):
   `{"region": "...", "reference": "what is cited", "cited_in": "source_id or URL", "evidence_quote": "≤ 20 words", "status": "not located|catalogue only|physical access needed|permission needed|paid access", "next_step": ""}`
   Do not call a lead a "missing document" unless evidence shows that it existed.

## 5. Finish
Return a report of at most 200 words: new candidates by acquisition_target and by decade, searches run, leads recorded, access problems. Do not interpret history or language.
