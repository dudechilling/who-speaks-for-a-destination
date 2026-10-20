# Sweep 1 — Recovery of known candidates

Task: CMNS3500-P3-DISCOVERY-02 (prompt record `prompts/20261020-072326_CMNS3500-P3-DISCOVERY-02.md`).
Execution: 2026-10-20, 07:28–08:25 UTC (controller runs), with checks and publication afterwards.
Previous state: commit `33e38e0` (end of DISCOVERY-01).

This sweep retrieved candidates that were already in the register. It did not search for new documents. Every row is still a candidate. No document is researcher-approved.

## 1. Baseline verification

| Figure | Reported in DISCOVERY-01 | Verified at start of sweep 1 |
|---|---|---|
| Candidate rows | 1,711 | 1,711 |
| Downloaded files | 929 | 929 (all checksums match) |
| Skipped because of the budget | 681 | 681 |
| Incomplete downloads | 13 | 13 |
| Rows without a publication year | 809 | 809 |
| Retrieved PDFs with little or no text | 211 | **about 60**. The figure of 211 was wrong: it counted PDFs whose text had not yet been extracted. The 60 is based on the text layer of the first 5 pages, so it is approximate. |
| Bytes on disk | 1,982,683,550 | 1,982,683,550 |

## 2. Method
- **Controller:** `scripts/sweep_controller.py`, run as an unprivileged systemd user unit (`systemd-run --user`).
  - State is written atomically to `.discovery_state/controller.json` (local only), with a 30-second heartbeat that makes no network requests.
  - A non-blocking lock prevents a second controller from running against the index.
  - Finished jobs are skipped on restart.
- **Access rules:** all requests go through `scripts/polite_fetch.py`: one request per host, at least 2 s between requests (4 s for archive.org), robots.txt, 429/Retry-After, and a stop on 401/403.
- **Acceptance test.** A file is stored only when all of these hold:
  - the server returned HTTP 200;
  - the length matches Content-Length;
  - the content type matches the URL;
  - it is not an error page;
  - for PDFs, `pdfinfo` parses the file.
- **Recovery rule:** a complete copy is stored as `<source_id>_complete.<ext>`. The truncated file is kept and listed, with its SHA-256, in the new `superseded_local_files` column. No original was overwritten.
- **Acquisition log:** every attempt is recorded in `corpus/originals/acquisition_log.jsonl` with URL, HTTP status, error, bytes, acceptance result and Wayback `x-archive-src`. The log holds no content.
- **Two job queues:**
  - Main queue (726 jobs):
    1. 13 incomplete files;
    2. 249 skipped priority A–C documents;
    3. 8 failed downloads eligible for retry;
    4. 25 metadata-only rows with a document link;
    5. 406 skipped priority D documents;
    6. 25 visitor guides.
  - Supplementary queue (158 jobs):
    - 40 incomplete files, tried against the live URL and every other Wayback capture found by a CDX lookup;
    - 107 robots-blocked items, tried against Wayback captures;
    - 11 retries after two fixes: plain-text OCR files are now accepted, and URLs with spaces are now encoded.

## 3. Cause of the 1 MiB truncation
The 13 incomplete files from DISCOVERY-01 were not caused by the retrieval method. The Wayback responses carried `x-archive-src: CC-MAIN-…`, meaning the captures come from Common Crawl WARC files. Those records end at 1,048,576 bytes, and the archive reports that figure as the original length (`x-archive-orig-content-length: 1048576`).

For the NBCTA 2021–24 strategic plan, for example, a later ArchiveTeam capture and the live official URL both return the complete 8,606,033-byte file with the same SHA-256.

Recovery therefore tried the live URL first, then every other capture with a different digest.

## 4. Results

| Measure | Sweep 1 |
|---|---|
| Retrieval jobs | 884 (726 + 158) |
| HTTP retrieval attempts logged | 801, of which 647 were accepted |
| Wayback CDX lookups | 147 (recovery and robots-blocked jobs) |
| Search-engine queries | 0 (recovery only) |
| New candidates discovered | 0 |
| Newly downloaded documents | 585 complete files |
| DOWNLOAD_FAILED rows recovered | 2 |
| Incomplete files from DISCOVERY-01 recovered | 11 of 13. 1 more turned out identical to another row's file and is marked DUPLICATE. 1 is still incomplete (`VI_2019_TVI_Business_Plan_FY20`: live URL 404, both Wayback captures truncated). |
| Newly downloaded PDFs that failed the parse test | 39. 38 were recovered from another capture or the live URL; 1 is still incomplete (`TO_nd_Route97_Be_Curious_2019`). |
| Duplicates identified | 9 rows whose file is identical to another row's. They are marked `DUPLICATE` with `duplicate_of`, and the file is not stored twice. |
| Additional downloaded bytes | 1,717,342,687. Includes the 39 superseded truncated files kept as history. |
| Publication dates verified | 0 (scheduled for sweep 3) |

### Change from the previous checkpoint

| Status | After DISCOVERY-01 | After sweep 1 | Change |
|---|---|---|---|
| DOWNLOADED | 916 | 1,512 | +596 |
| DOWNLOADED_INCOMPLETE | 13 | 2 | −11 |
| DUPLICATE | 0 | 9 | +9 |
| METADATA_ONLY | 729 | 24 | −705 |
| ACCESS_RESTRICTED | 14 | 119 | +105 |
| DOWNLOAD_FAILED | 11 | 17 | +6 |
| UNAVAILABLE | 28 | 28 | 0 |
| **Total candidates** | 1,711 | 1,711 | 0 |

The +596 downloads are the 585 newly downloaded files plus the 11 recovered files.

New complete downloads by region:

| Region | New downloads |
|---|---|
| Northern BC | 191 |
| Cariboo Chilcotin Coast | 157 |
| Kootenay Rockies | 84 |
| Vancouver Island | 67 |
| Thompson Okanagan | 60 |
| Multi-region | 37 |

New complete downloads by decade of evidenced publication:

| Decade | New downloads |
|---|---|
| 1970s | 1 |
| 1980s | 8 |
| 1990s | 6 |
| 2000s | 115 |
| 2010s | 65 |
| 2020s | 113 |
| Unknown | 288 |

## 5. Historical gaps addressed
- No new period was opened. Sweep 1 only retrieved documents that were already known.
- Pre-1999 holdings grew slightly: newspaper OCR items for the Kootenay Boundary Visitors Association and the Kootenay Country Tourist Association were retrieved after the plain-text fix.
- Most new downloads are 2000–2026 governance and reporting files: NBCTA minutes and newsletters, CCCTA AGM, board and financial files, and Tourism VI governance files.
- The 1985–1998 gap is unchanged. Sweep 2 is planned to search it.

## 6. Remaining failures and leads
- **ACCESS_RESTRICTED (119):**
  - 105 NBCTA newsletters on `mailchi.mp` and 1 file on `files.constantcontact.com`. robots.txt disallows automated retrieval, and the Wayback CDX lists no capture. Not bypassed.
  - 13 earlier restrictions remain: Google Drive, members-only pages and bot challenges.
- **DOWNLOAD_FAILED (17):**
  - news.totabc.org: DNS failure.
  - unwto.org: HTTP 530.
  - 404s with no archived copy.
  - UBC Open Collections viewer pages, which are HTML, not files.
  - One Library and Archives Canada Archive-It URL.
  - One transfer that ended early (`MR_nd_TBC_Policy_Manual_07`), eligible for retry in sweep 4.
- **DOWNLOADED_INCOMPLETE (2):** listed above.
- **METADATA_ONLY (24):** catalogue records and listing-only items with no file link.
- **UNAVAILABLE (28):** unchanged since DISCOVERY-01.

## 7. Verification (`scripts/validate_inventory.py`, compared with `33e38e0`)
All checks passed.

| Check | Result |
|---|---|
| Indexed files exist | 1,516 of 1,516 |
| Checksums match | 1,516 of 1,516 |
| Files on disk accounted for | 1,564 on disk: 1,516 indexed and 48 superseded truncated files. None unaccounted. |
| Identical files stored twice | none |
| Source IDs removed or duplicated | none |
| Rows without a URL | none |
| Dated rows without `date_evidence` | 0 of 902 |
| Publication date equal to capture date | none |
| DOWNLOADED PDFs that do not parse | none |
| Failed or restricted rows without a reason | none |
| Author-to-source links (both author files) | all valid |
| `include` / `selection_notes` changed | none; all 1,711 `include` cells are blank |

**Public author copy:** `authors_public.csv` was regenerated with a stricter contact pattern. It now also removes one phone number in parenthesized-area-code form that the earlier copy missed (row N0507). **That number is still in commit `33e38e0`.** Removing it from history would need a force-push, which this task does not allow. Earl's decision is required.

## 8. Checkpoint
- Commit: recorded in `results/discovery_sweeps/checkpoints.md` after the push. A commit cannot contain its own SHA.
- Cumulative coverage: `results/discovery_sweeps/coverage_assessment.md`.
