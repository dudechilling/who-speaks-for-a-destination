# Sweep 3 — Cross-reference, date inspection and coverage assessment

Task: CMNS3500-P3-DISCOVERY-02.
Execution: 2026-10-20.
- Text extraction and selective OCR: 09:40–17:25 UTC. The session was interrupted and then resumed.
- Review agents: 17:28–17:47 UTC.
- Apply, checks and publication followed.

Previous checkpoint: sweep 2, commit `9a794658905489f431bbaec58e7145a2b96037b1`.

Agent instructions, saved word for word:
- `prompts/20261020-172829_CMNS3500-P3-DISCOVERY-02_sweep3-agent-brief.md`
- `prompts/20261020-172829_CMNS3500-P3-DISCOVERY-02_sweep3-dispatch.md`

Raw records: `results/discovery_records/sweep3/` (date reviews, references and organization-name records). The agents' name files are not published; names are published only in `authors_public.csv`.

No document was downloaded, and no network request was made, in this sweep.

## 1. Method
1. **Text extraction.** Text was extracted from all 1,666 complete downloads into `corpus/derived/text/`. That folder is local only and contains source text, so it is never published.
2. **Selective OCR.** `scripts/ocr_first_pages.py` ran Tesseract on the first two pages of the 61 PDFs without a text layer. Page images are kept beside the OCR text so that each reading can be checked against its image (`corpus/derived/ocr/`, local only). OCR was used only to establish titles, dates and names. The original files are unchanged.
3. **Review packets.** `scripts/build_review_packets.py` built packets containing first-page lines, date lines and role lines with page numbers. They covered:
   - every downloaded row without a year (796);
   - every downloaded row whose year came only from a filename, link text or listing (587);
   - every document downloaded in this task that had no author record (465 with role lines).
4. **Nine review agents** recorded dates, names, organization names and references from the packets, under the rules in the brief: no guessing, quotations of at most 20 words, and capture dates never used.
5. **Machine check before applying.** `scripts/apply_sweep3.py` applied a result only after confirming it against the extracted text:
   - every quoted piece of date evidence;
   - every printed title;
   - every recorded name.

   Earlier values are kept in `date_evidence` and `availability_notes`; they are appended to, never replaced. `source_id`, `include` and `selection_notes` were not changed.

## 2. Publication dates

| Outcome | Rows |
|---|---|
| Reviewed | 1,383 |
| `verified_in_document`: date printed in the document, with quote | 815 |
| `corrected_from_document`: printed date differs from the filename/listing date; documented value applied, earlier value kept in evidence | 23 |
| `uncertain`: only weak evidence (web-footer copyright, plan period, data period) or conflicting evidence | 384 |
| `not_found_in_document`: no date in the document | 119 |
| `listing_only_not_confirmed`: year from a listing or filename that the document does not confirm | 33 |
| `read_from_page_image_needs_confirmation`: OCR garbled; agent read the image; not applied | 7 |
| `agent_claim_not_confirmed`: quote not found in the text; not applied | 2 |

| Change from the previous checkpoint | Before | After |
|---|---|---|
| Rows with a publication year | 1,009 | 1,385 |
| Rows without a year | 863 | 487 |
| Year or date changed | — | 579 rows (new values and corrections) |
| Titles replaced by the printed title | — | 371. The earlier listing or filename title is kept in `availability_notes`. |

Every dated row has `date_evidence`. 489 rows have no `date_status`: these were not in the review scope, because their date evidence was recorded at discovery or they are not downloaded.

**Corrections of note** (from documents):
- `VI_2005_News_Release_AGM_Saltspring_2005` is dated 2004-06-04.
- The Destination BC "Provincial Tourism Indicators 2015" file was issued in April 2016.
- Kootenay Rockies director bios are dated 2013-10-30.
- Three TOTA INSTO annual reports were published a year after their report year.
- The NBCTA "Regional Profiles … Apr23" file is dated April 2013.

## 3. Names and organization names
- **`authors.csv`** (canonical, local): 755 → 1,465 name occurrences. 710 were added, each confirmed in the text of its source document. 27 were skipped as repeats; 1 was skipped because the name does not appear in the source text.
- **`authors_public.csv`:** regenerated with `scripts/make_public_authors.py`. 9 rows have contact details removed.
- **Organization-name records:** 96, with quotes, in `results/discovery_records/sweep3/*_orgnames.jsonl`. New evidence includes:
  - Kootenay Boundary Visitors Association formed in 1978. The Kootenay Country Tourist Association, formed in March 1985, "replaced" it.
  - "Tourism Rockies" became "Kootenay Rockies Tourism" between the 2003 and 2004 guides. Hansard of March 2003 records the name change.
  - "Cariboo Tourist Association" appears in 1989–1994 records.
  - A provincial document names the Okanagan Similkameen Tourism Association as the predecessor of TOTA.
  - Tourism VI and 4VI renaming statements.

  These records are evidence for the researcher to review. They are not a validated succession chain.

## 4. References inside documents
523 references to other documents were recorded with quotes. 187 of them cite a year before 2010. Most are AGM minutes and financial statements, strategic, business and marketing plans, bylaws, governance manuals, and Tourism BC / Destination BC plans and reports. They are the input for the sweep-4 reconciliation (`results/discovery_records/sweep3/*_refs.jsonl`).

## 5. Metadata and integrity problems found (to resolve in sweep 4)
1. **Wayback capture dates.** Some candidates gave an approximate capture timestamp. The Wayback Machine then served the closest capture, which can be much later; for example, pages recorded as 2017 or 2021 contain the 2026 site. Affected rows include several `CC_nd_CC_*_2017` pages and three KR roster pages. Proposed fix: identify the actual capture by matching each file's SHA-1 against the Wayback CDX digests, with no new download.
2. **Wrong content.**
   - `VI_…New_Board_Members_2023_Page` holds a bot-check page.
   - `CC_nd_CC_RDMO_2000` is a 2004 retailer advertising sheet.
   - `MR_2006_COTA_Board_News_Release_2006` is a BC Lodging and Campgrounds Association release.
   - `MR_nd_DBC_Annual_Service_Plan_Report_2015_16` contains the 2014/15 report.
3. **Text layers that need OCR.** Garbled font encoding affects NBCTA *On the Horizon* (August and October 2005), the 2007–08 Marketing Guide, and the Tourism VI stakeholder criteria (2014, 2016). Two Destination BC FY14/15 contracts have pages without text.

## 6. Coverage assessment by dataset (provisional mapping; full tables in `coverage_assessment.md`)

Complete downloads of core document groups by region, with the evidenced year range:

| Document group | Vancouver Island | Thompson Okanagan | Kootenay Rockies | Northern BC | Cariboo Chilcotin Coast |
|---|---|---|---|---|---|
| Annual report | 2 (2023) | 5 (2022–2026) | 10 (2015–2023) | 3 (2021–2023) | 3 (2020–2023) |
| Financial statements | 1 (undated) | 4 (2009–2021) | 4 (2022–2025) | 0 | 17 (2005–2026) |
| Strategic plan | 5 (2010–2022) | 2 (2019) | 1 (2020) | 2 (2021–2024) | 4 (2019) |
| Business plan / budget | 5 (2011–2020) | 0 | 10 (2025) | 0 | 0 |
| Board roster / biographies | 10 (1998–2026) | 9 (2001–2016) | 7 (2013) | 21 (2002–2023) | 10 (2003–2009) |
| Board election / appointment | 41 (2000–2023) | 18 (2001–2026) | 28 (1981–2025) | 13 (2003–2025) | 32 (2004–2026) |
| Board / AGM minutes | 0 | 0 | 14 (2021–2025) | 36 (2001–2007) | 12 (2003–2025) |
| AGM report / notice / package | 24 (1998–2021) | 12 (2001–2019) | 23 (2009–2024) | 23 (1994–2025) | 37 (2003–2026) |
| Bylaws / constitution / membership | 24 (2001–2022) | 7 (2001–2006) | 9 (2016–2025) | 9 (2003–2020) | 10 (2003–2024) |
| Governance framework / policy | 17 (2004–2019) | 4 (2015) | 2 (2024) | 5 (2000–2007) | 6 (2018–2023) |
| Funding agreement / contract | 14 (2003–2026) | 9 (2009–2026) | 10 (1988–2026) | 9 (2014–2026) | 11 (2015–2026) |
| Destination development / management strategy | 24 (1991–2026) | 20 (2012–2025) | 18 (1990–2025) | 15 (1984–2025) | 21 (1987–2025) |
| Marketing plan | 18 (2010–2017) | 5 (2016) | 6 (2016–2023) | 7 (2003–2007) | 31 (2003–2025) |
| Newsletter | 52 (1998–2019) | 23 (1999–2011) | 3 (1998–2005) | 63 (2001–2022) | 16 (2007–2022) |
| Sustainability / stewardship report | 13 (2009–2023) | 7 (2020–2023) | 7 (2021–2024) | 3 (2021–2022) | 2 (2022) |
| Performance / research report | 58 | 16 | 61 | 96 | 47 |

Ranges use the evidenced publication year. Undated files are counted but have no range. Several pre-1995 rows in these groups are provincial or regional reports filed under a region, not the association's own documents.

### Important gaps
- **Dataset A (language).**
  - The preferred source type, annual reports, exists only from 2015 (KR) or 2020–2023 (the others).
  - The associations' own public statements before about 1998 are almost absent in every region.
  - For 1998–2012, comparable texts exist mainly as newsletters, AGM material and web pages, and they are uneven by region (strong for VI and NB; weak for KR and TO; CC from 2003).
- **Dataset B (governance).**
  - Board records are the best-covered group: rosters, elections and AGM records from about 1998–2003 onwards in VI, NB and CC, and rosters for KR (1999–2003, 2009–2013) after sweep 2.
  - Board minutes exist only for NB 2001–2007, CC 2003 and 2020s, and KR 2021–2025.
  - Thompson Okanagan board records are thin after 2006.
  - Before 1998, governance evidence is limited to newspaper reports of AGMs and elections (KCTA, KBVA) and Hansard mentions.
- **Dataset C (performance).**
  - Financial statements: CC 2005 and 2018–2026; KR 2022–2025; TO four items; none for NB; one undated item for VI.
  - Performance measures appear mainly in Destination BC contracts (FY2013/14 onward), service plan reports and research reports.
  - The associations' own reported measures before 2010 are rare.
- **Region × period.** Complete downloads for 1985–1999 are now 20 (VI), 11 (TO), 16 (KR), 15 (NB), 2 (CC) and 19 (provincial). Many of these are Hansard records, provincial reports or newspaper OCR, not association documents. Cariboo Chilcotin Coast has no record from 1990–1999.

## 7. Inventory after sweep 3
Acquisition statuses are unchanged from sweep 2:

| Status | Rows |
|---|---|
| DOWNLOADED | 1,667 |
| DOWNLOADED_INCOMPLETE | 2 |
| DUPLICATE | 9 |
| METADATA_ONLY | 24 |
| ACCESS_RESTRICTED | 120 |
| DOWNLOAD_FAILED | 19 |
| UNAVAILABLE | 31 |
| **Total** | **1,872** |

- No new candidates, downloads or bytes in this sweep. The task total stays at 1,881,415,995 additional bytes.
- No document is researcher-approved, and no SFL coding or CDA was performed.

## 8. Verification (`scripts/validate_inventory.py`, compared with sweep 2)
All checks passed.

| Check | Result |
|---|---|
| Indexed files exist and checksums match | 1,671 of 1,671 |
| Files on disk accounted for | 1,719 |
| Duplicate files | none |
| Source IDs removed | none |
| Rows without a URL | none |
| Dated rows without `date_evidence` | 0 of 1,385 |
| `include` / `selection_notes` changed | none |
| Author links (1,465 rows in each author file) | all valid |

- **Publication date equal to capture date:** 5 rows. Each is a news post or press release captured on its publication day, with the date printed in the document. The validator now accepts equal dates only when the date is verified in the document, and lists these 5 rows.
- **Privacy and secrets check:** passed before the commit.
