<!--
Agent instruction record
Task identifier: CMNS3500-P3-DISCOVERY-02, sweep 4
Written: 2026-10-20 17:51:25 UTC by the lead agent (Claude)
Given to: four delegated reconciliation agents (see the dispatch record of the same timestamp)
Content below this comment: the brief, unchanged.
-->

# Agent brief — CMNS3500-P3-DISCOVERY-02, sweep 4 (conditional reconciliation)

Language: short, direct technical English. You are one of several parallel agents.
All paths are relative to `WF=/mnt/current-semester/Fall 2026/CMNS 3500/Assignments/Project 3 - Final Project/Working Files`.

## 1. Read first
- Task prompt: `prompts/20261020-072326_CMNS3500-P3-DISCOVERY-02.md`, sections 4, 8 and 9.
- Sweep reports: `results/discovery_sweeps/sweep_02_historical_search.md` (§5 leads) and `sweep_03_coverage_assessment.md` (§4–§6).
- References found inside held documents: `results/discovery_records/sweep3/*_refs.jsonl` (fields: region, reference, year_cited, cited_in, page, evidence_quote).
- Earlier leads and search logs: `results/discovery_records/sweep2/*_leads.jsonl`, `*_searchlog.jsonl`, and `results/discovery_records/pass1|pass2/*_searchlog.jsonl`. Do not repeat a failed search without a reason to expect a different result. Write the reason in your log.
- Register (read only): `corpus/originals/source_index.csv`. Before you record a candidate, check `original_url`, `archive_url`, `alternate_urls` and the `document_title` values for the same organization and year. A document already in the register is not new.

## 2. Hard rules
- Discovery only. Do not download documents. Write only to `WF/.discovery_state/sweep4/`.
- For every HTTP request use only `scripts/polite_fetch.py` with `POLITE_STATE_DIR="$WF/.discovery_state/polite"` (`--max-bytes 4096` to sniff a file). It enforces one request per host, ≥ 2 s (4 s for archive.org), robots.txt, 429/Retry-After and stop-on-403. Another process is using web.archive.org now; expect slow responses and do not work around the queue. WebSearch is allowed. Do not use WebFetch, curl or wget.
- Do not bypass logins, CAPTCHAs, bot challenges, paywalls or access controls. Do not retry a host that denied access.
- **Wayback timestamps:** give the exact 14-digit timestamp from a CDX result, never an approximate or 8-digit timestamp. The fetch URL is `https://web.archive.org/web/<14-digit ts>id_/<original URL>`. The capture date is never a publication date.
- Do not guess dates, titles or authors. Do not interpret content. No SFL, no CDA.
- Do not record personal email addresses or phone numbers.
- Do not call an unresolved reference a "missing document" unless evidence shows that it existed (for example, it is cited with a title and year in a held document).

## 3. Task
Work through the references and leads for your scope, in this order:
1. references that cite a year before 2010 and a core type (annual report, financial statements, strategic/business/marketing plan, bylaws/constitution, governance manual/policy, AGM minutes or report, board list);
2. other pre-2010 references;
3. leads from sweep 2 marked "not located" that name a specific document and a likely web location;
4. later core-type references (2010–2026) not in the register.

For each item: search the official domains in the Wayback CDX (by path patterns and filename words), the live sites, and the web. Group references that point to the same document.

## 4. Outputs (JSON Lines) in `WF/.discovery_state/sweep4/`
1. `<PREFIX>_candidates.jsonl` — new documents, in exactly the candidate format of the sweep-2 brief (`prompts/20261020-083520_CMNS3500-P3-DISCOVERY-02_sweep2-agent-brief.md`, §4.1), with `"found_by": "sweep 4: <reference or query>"`.
2. `<PREFIX>_searchlog.jsonl` — every search action, sweep-2 format, with `"sweep": 4`.
3. `<PREFIX>_resolution.jsonl` — one line per reference or lead you worked on:
   `{"region": "...", "reference": "...", "cited_in": "source_id or lead file", "outcome": "found_new_candidate|already_in_register|not_located_online|requires_physical_archive|requires_permission_or_paid_access|requires_human_contact", "source_id_or_url": "", "note": "short"}`

## 5. Finish
Return a report of at most 150 words: references worked, outcomes by type, new candidates by decade, access problems.
