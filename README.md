# Who Markets a Destination?

A historical study of the language, leadership and stated priorities of British Columbia's regional tourism organizations.

Course project: CMNS 3500 (Power and Language), Thompson Rivers University, Fall 2026, Project 3.

## Current status (2026-10-20)

| Stage | Status |
|---|---|
| Provisional research design | Written. See [`research-design.md`](research-design.md). It is **not** an approved methodology. |
| Preliminary source discovery | **Complete** (task CMNS3500-P3-DISCOVERY-01). |
| Recovery and expansion sweeps | **In progress** (task CMNS3500-P3-DISCOVERY-02). See [`results/discovery_sweeps/`](results/discovery_sweeps/). |
| Human review of the corpus | **Not started.** No document is approved for the corpus. |
| SFL coding and CDA | **Not started.** |
| Analysis and findings | **Not started.** This repository contains no findings. |

The discovery results show which documents are publicly available. They do not show what the documents say, and they do not select a corpus.

## The study

The study asks how the dominant frames of five regional tourism organizations changed over time: economic growth, marketing, community development, environmental stewardship, Indigenous participation and destination management. It also asks how those changes relate to governance structures and stated measures of success. The design proposes three linked datasets:

- language in public documents (Systemic Functional Linguistics, with supporting Critical Discourse Analysis);
- historical board composition;
- organizational priorities and performance measures.

Organizations in scope:

- Tourism Vancouver Island / 4VI;
- Thompson Okanagan Tourism Association;
- Kootenay Rockies Tourism;
- Northern BC Tourism Association;
- Cariboo Chilcotin Coast Tourism Association;
- their documented predecessors.

The discovery range is 1985–2026.

## Repository contents

| Path | Content |
|---|---|
| `research-design.md` | Provisional research design. Controls the scope. |
| `corpus/originals/source_index.csv` | Discovery register: 1,711 candidate documents with provenance. |
| `corpus/originals/authors_public.csv` | Public-release copy of the author index: 755 name occurrences (authors, signatories, editors, executives, board chairs) taken from collected documents. |
| `results/discovery_summary.md` | Discovery report: counts, methods, names, gaps, access limits, technical decisions. |
| `results/discovery_records/` | Raw agent records: candidate lists, organization-name evidence and search logs (pass one and pass two). |
| `results/discovery_sweeps/` | DISCOVERY-02 sweep reports, the cumulative coverage assessment and the checkpoint list. |
| `corpus/originals/acquisition_log.jsonl` | Append-only log of every retrieval attempt since DISCOVERY-02: URL, HTTP status, error, bytes, acceptance result. No content. |
| `scripts/sweep_controller.py` | Restartable sweep controller (state, heartbeat, byte cap, disk floor, safe recovery). |
| `scripts/validate_inventory.py`, `scripts/sweep_stats.py`, `scripts/coverage_report.py` | Inventory checks, sweep change figures and coverage tables. |
| `scripts/make_public_authors.py`, `scripts/prepublish_check.py` | Public author copy and the privacy/secrets check run before every commit. |
| `scripts/polite_fetch.py` | Rate-limited HTTP fetch helper. |
| `scripts/collect.py` | Downloads candidates, checks file type and checksum, and writes the source index. |
| `prompts/` | Prompt records for each authorized task, saved word for word before execution. |

### Candidate documents versus approved documents

Every row in `source_index.csv` is a **candidate**. No row is approved.

- The `include` column holds the researcher's decision: `INCLUDE`, `EXCLUDE` or `REVIEW`.
- A **blank** `include` cell means that no decision has been made. All 1,711 cells are blank now.
- Only a row that the researcher marks `INCLUDE` is part of the research corpus.
- `acquisition_status` describes availability only (`DOWNLOADED`, `METADATA_ONLY`, `UNAVAILABLE`, `ACCESS_RESTRICTED`, `DOWNLOAD_FAILED`, `DOWNLOADED_INCOMPLETE`, `DUPLICATE`). It does not show approval. `DUPLICATE` rows point to the row that holds the identical file (`duplicate_of`).
- `superseded_local_files` lists truncated files that a verified complete copy replaced. The truncated files stay on the m710 with their SHA-256.
- `date_status` records how a publication date was checked (added in DISCOVERY-02).
- `metadata_confidence` and all titles, dates and document types are recorded by AI agents. A person has not reviewed them.

### Provenance fields

- **Source index:** each row keeps its `original_url`; its Wayback `archive_url` and `archive_capture_date` (kept separate from `publication_date`); `retrieval_date`; `sha256`; `date_evidence`; `title_basis` and `found_by`.
- **Author index:** `authors_public.csv` is identical to the canonical `authors.csv` (kept on the m710) except in 8 `evidence_note` cells. In those cells, quoted email addresses and phone numbers are replaced with `[contact details removed]`. Each name occurrence keeps its `source_id`, `page_or_section` and a short `evidence_note`. Names were not merged across documents. Generated `search_variants` are search aids, not verified identities.

## Not in this repository

| Material | Reason |
|---|---|
| Downloaded originals (under `corpus/originals/<Region>/`; counts in the latest sweep report) | Third-party documents. Copyright stays with the publishers and archives. They are kept on the researcher's machine (m710). |
| Incomplete and superseded truncated downloads | Not usable, and third-party content. |
| Extracted source text and OCR output (`corpus/derived/`) | Full text of third-party documents. Not published without permission. |
| Controller state (`.discovery_state/`) | Private local agent state. |
| `corpus/originals/authors.csv` | Canonical author index. It quotes contact details from documents; the public copy above removes them. |
| `methodology.md` | Unapproved early draft. It is not the project methodology. |
| Draft proposal (`.docx`) and office files | Drafts. The draft proposal includes third-party images. |

Each `local_file` path in the index points to the copy on the m710. That file is not in this repository.

## Reproducing the discovery

### Requirements
- Python 3.10 or later (standard library only).
- The `file` utility (libmagic), used for file-type checks.
- Network access to the public web and the Internet Archive.
- `pdftotext` (poppler-utils), only to repeat the name extraction.

### Sweeps (DISCOVERY-02)
```bash
python3 -I -B scripts/sweep_controller.py build-sweep1 --out .discovery_state/queues/sweep1.jsonl
systemd-run --user --unit=cmns3500-discovery-s1 --working-directory="$PWD" \
  /usr/bin/python3 -I -B scripts/sweep_controller.py run --sweep 1 --queue .discovery_state/queues/sweep1.jsonl
python3 -I -B scripts/sweep_controller.py status
python3 -I -B scripts/validate_inventory.py --rev HEAD
```
The controller can be restarted at any time; finished jobs are skipped. Only one controller can hold the index lock.

### Steps (DISCOVERY-01)
1. **Searches.** The search queries, platforms and dates are in `results/discovery_records/pass*/**_searchlog.jsonl`. The query patterns are in `results/discovery_summary.md` §3. AI agents ran the searches with a web-search tool and with the Wayback CDX API. Search-engine results change over time, so a repeat search can return different results.
2. **Retrieval.** `collect.py` reads the candidate files and downloads each `fetch_url`, with one request per host at a time, 2 s between requests (4 s for archive.org), robots.txt compliance, and Retry-After handling. Run order used:
   ```bash
   export POLITE_STATE_DIR=/tmp/polite_state
   # Pass one, PRIORITY A–C document types first (the original run split each candidate
   # file by document type; PRIORITY D rows were then registered with --budget-bytes 1)
   python3 -I -B scripts/collect.py --root . --budget-bytes 2000000000 results/discovery_records/pass1/*_candidates.jsonl
   # Pass two
   python3 -I -B scripts/collect.py --root . --budget-bytes 2000000000 results/discovery_records/pass2/*_candidates.jsonl
   ```
   The script never overwrites a file, and it keeps the user columns `include` and `selection_notes`.
3. **Verification.** Fetch a row's `original_url`, or its `archive_url` with `id_` after the timestamp (raw capture). Compare the SHA-256 of the file with the `sha256` column. Live official files may have changed since 2026-10-20. Wayback raw captures should match.
4. **Names (pass two).** Authors, signatories, editors, executives and board chairs were read from page text (`pdftotext -layout`) by AI agents. Each name was then checked against the text of its source document.

The source IDs in `source_index.csv` are canonical. A new run from scratch can assign IDs in a different order.

## Access limitations
- **Blocked by robots.txt or bot checks:** MemoryBC (bot challenge); Canadiana, LAC Aurora and WorldCat (robots.txt); one Destination Canada PDF.
- **Not reachable on 2026-10-20:** BC Archives search (SSL error); bchdp-i2.arcabc.ca and news.totabc.org (DNS); unwto.org (HTTP 530).
- **Members-only or login pages** (2006 association sites) and **Google Drive files** were not accessed.
- **The 2 GB download budget was reached in DISCOVERY-01.** DISCOVERY-02 is authorized to download up to 4,000,000,000 more bytes and keeps at least 5 GB of disk free. See the sweep reports.
- **robots.txt:** 105 NBCTA newsletters on mailchi.mp are disallowed for automated retrieval and have no Wayback capture.
- **Little survives from before 1998.** Records from 1985–1998 are rare in every region.

See `results/discovery_summary.md` §5–§8 for gaps, failures and unresolved leads.

## AI assistance

Claude (Anthropic) agents carried out the searches, retrieval and metadata recording under the researcher's task prompts (see `prompts/`). All AI-recorded metadata is unreviewed. Research design and methodological decisions belong to the researcher.

## License

No license is granted at this time.
