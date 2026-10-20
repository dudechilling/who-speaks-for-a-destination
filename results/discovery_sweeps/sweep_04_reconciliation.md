# Sweep 4 — Conditional reconciliation

Task: CMNS3500-P3-DISCOVERY-02.
Execution: 2026-10-20, 17:50–20:50 UTC, with checks and publication afterwards.
Previous checkpoint: sweep 3, commit `02f57f803dd765468150ce6fe9964b2396a076ad`.

**Why a fourth sweep was justified.** Sweep 3 left material that could still be recovered or corrected:
- 523 references to documents not yet located;
- Wayback capture dates that may be wrong;
- four content errors that the documents themselves show;
- PDFs without a usable text layer;
- transfers eligible for retry.

Agent instructions, saved word for word:
- `prompts/20261020-175125_CMNS3500-P3-DISCOVERY-02_sweep4-agent-brief.md` and `…_sweep4-dispatch.md` (four reconciliation agents);
- `prompts/20261020-201943_CMNS3500-P3-DISCOVERY-02_sweep4-review-dispatch.md` (one review agent, reusing the sweep-3 brief).

Raw records: `results/discovery_records/sweep4/`.

## 1. Wayback capture verification (no new downloads)
`scripts/verify_wayback_captures.py` computed the SHA-1 of every retrieved Wayback file and compared it with the CDX digests for the original URL. The request rules were the same as for downloads.

| Result (864 Wayback-sourced files) | Rows |
|---|---|
| Capture date confirmed by digest | 732 |
| Capture date corrected to the capture that holds the retrieved file (earlier value kept in `availability_notes`) | 83 |
| No capture listed by the CDX for the original URL (file probably retrieved through an alternate URL) | 34 |
| Digest matches no capture | 15 |

**Run history (reported for transparency):**
1. The first run built CDX queries with an explicit `:80` port, which the CDX does not match. Its "no match" results were false.
2. The script was corrected (ports removed, `http://` form retried, empty CDX responses recorded separately) and run again.
3. A second fault, a skip filter that matched the word "digest" in older agent notes, left 362 rows unchecked. A third run covered them.

Every one of the 864 files was checked in the end. Only sweep-4 notes were replaced, and no other record was changed. Publication dates were never set from capture dates.

## 2. Corrections from primary evidence
`scripts/apply_corrections.py` applied 11 documented corrections (`.discovery_state/sweep4/corrections.json`). Each one is based on the document's own text, and OCR readings were checked against the page image.
- `VI_nd_New_Board_Members_2023_Page`: the retrieved file is a bot-check page. Status is now ACCESS_RESTRICTED; the file is kept in `superseded_local_files`.
- `CC_nd_CC_RDMO_2000`: a Save-On-Foods Travel Catalogue advertising sheet, Spring 2004 issue. Title, type and year were corrected; the source ID is unchanged.
- `MR_2006_COTA_Board_News_Release_2006`: the issuer is the BC Lodging and Campgrounds Association (press release of 2005-11-09).
- `MR_nd_DBC_Annual_Service_Plan_Report_2015_16`: contains the 2014/15 report (identical text). It is now DUPLICATE of `MR_nd_DBC_Annual_Service_Plan_Report_2014_15`. **The 2015/16 report is not in hand.**
- **Dates, checked against page images:**
  - Destination BC mandate letters: 2019-01-16 and 2020-01-17.
  - FY14/15 regional contracts for CCC, KR, TO and VI: cover letter of 2014-02-14.
- NBCTA marketing guide: printed title "2005/2006 Marketing and Opportunities Guide". Its date stays uncertain, because 2005/2006 is a plan period.

**Selective OCR** of the first pages of 12 more PDFs with garbled or missing text layers (`scripts/ocr_first_pages.py`; derived text stays local).

## 3. Reference and lead reconciliation
Four agents worked 390 references and leads.

| Outcome | Count |
|---|---|
| already in register | 112 |
| not located online | 98 |
| requires human contact | 80 |
| found new candidate | 45 |
| requires physical archive | 44 |
| requires permission or paid access | 11 |

- **"Requires human contact"** mostly covers board minutes, financial statements and Destination BC deliverables (regional operations plans and quarterly performance reports). These were presented at meetings or to the funder and never posted publicly. 42 of these are NBCTA items and 18 are Vancouver Island items.
- **"Requires physical archive"** covers 1980s–1990s provincial contracts with the regional associations (Partners in Tourism, 1991–93), Tourism BC annual reports 1997/98 and 1999/2000, ministry annual reports 1989/90–1997/98, correspondence named in Hansard, regional newspaper runs, and BC Archives series GR-3558.

### New candidates

| Measure | Sweep 4 |
|---|---|
| New candidate rows | 100. One file was later found identical to a held document and the row is marked DUPLICATE; repeated hits were merged and not counted. |
| Rows downloaded | 64 complete and 1 incomplete. The incomplete file is a TIABC presentation that does not parse. |
| Recorded as UNAVAILABLE | 35. These were cited or linked, but no retrievable copy was found. Examples: TAVI 2002 AGM files, 2006–07 board election files and board policy manuals, 2005 newsflash issues, TOTA bylaws and voting lists 2011–2016. |

New downloads include:
- 18 Hansard sittings 1992–1997, found through links in the subject indexes;
- the 1994 *Statements of Policy on Tourism*. Attribution to COTA rests on noisy OCR, needs checking, and is marked LOW;
- Tourism BC shareholder's letters (2003/04, 2006) and Crown-agency expectations manuals (2006, 2011);
- the ministry service plan 2005/06–2007/08;
- AtBC *Blueprint Strategy* (2005);
- Destination BC regional agreements 2016–18 (KRT, NBC, TOTA, TVI);
- seven TOTA newsletters 2005–2008;
- TAVI 2002 and 2003 pages;
- Phase II labour-market survey pages;
- the NBCTA 2003/04 marketing guide page;
- KR 2014 online performance reports;
- the 1994 notice of the North By Northwest Tourism Association AGM, from a Terrace Standard OCR item.

**Still not located online:**
- the Thompson Okanagan 2012 strategy *Embracing Our Potential* (embedded from a document-hosting service and never archived);
- the Tourism BC annual reports of the late 1990s;
- primary documents on the 1997 regional restructuring;
- NBCTA financial statements and pre-2021 annual reports.

## 4. Retries

| Result (9 retry jobs) | Rows |
|---|---|
| Recovered (federal accessibility story page, previously timed out) | 1 |
| Robots.txt now disallows the archived copy (`MR_nd_TBC_Policy_Manual_07`); status ACCESS_RESTRICTED | 1 |
| Still failing | 7 |

The 7 still failing:
- Four Wayback transfers end at exactly 130,810 bytes on every attempt (`IncompleteRead`). This is a server-side limit on those captures, and they are not retried again.
- unwto.org still returns HTTP 530 (2 rows).
- One newsletter URL returns HTML instead of a PDF.

## 5. Review of sweep-4 downloads
One agent reviewed the new downloads. Every claim was machine-checked against the extracted text with `scripts/apply_sweep3.py --dir … --label "Sweep 4 review"`.

| Result | Count |
|---|---|
| Dates verified in document | 30 |
| Dates uncertain | 20 |
| Page-image readings not applied (need human confirmation) | 6 |
| Claim not confirmed | 1 |
| No date found | 1 |
| Printed titles | 17 |
| New name occurrences confirmed in text | 61 |
| Names read only from page images (not applied) | 21 |

The review also recorded 50 organization-name records and 179 references.

## 6. Inventory after sweep 4

| Status | After sweep 3 | After sweep 4 | Change |
|---|---|---|---|
| DOWNLOADED | 1,667 | 1,730 | +63 |
| DOWNLOADED_INCOMPLETE | 2 | 3 | +1 |
| DUPLICATE | 9 | 10 | +1 |
| METADATA_ONLY | 24 | 24 | 0 |
| ACCESS_RESTRICTED | 120 | 122 | +2 |
| DOWNLOAD_FAILED | 19 | 17 | −2 |
| UNAVAILABLE | 31 | 66 | +35 |
| **Total candidates** | 1,872 | 1,972 | +100 |

The +63 downloads are the 64 new rows and the 1 recovered retry, less the bot-check page and the content duplicate, which left the DOWNLOADED status.

| Other measure | Value |
|---|---|
| Rows without a publication year | 524 |
| Additional bytes in sweep 4 | 111,082,117 |
| Additional bytes in the whole task | 1,992,498,112 of 4,000,000,000 authorized |
| Free disk space | stayed far above the 5 GB floor |

## 7. Verification (`scripts/validate_inventory.py`, full run including the PDF parse check)
All checks passed.

| Check | Result |
|---|---|
| Indexed files exist and checksums match | 1,736 of 1,736 |
| Files on disk accounted for | 1,785 (indexed or superseded) |
| Identical files stored twice | none |
| Source IDs removed | none |
| Rows without a URL | none |
| Dated rows without `date_evidence` | 0 of 1,448 |
| DOWNLOADED PDFs that do not parse | none |
| Incomplete rows flagged | 3 |
| Failed or restricted rows without a reason | none |
| Author links (1,526 rows) | all valid |
| `include` / `selection_notes` changed | none |

Same-day captures documented in the document: 5.
