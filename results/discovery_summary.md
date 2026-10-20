# Discovery Summary — CMNS3500-P3-DISCOVERY-01

Task: preliminary historical source discovery.
Execution date: 2026-10-20 (UTC).
Prompt record: `prompts/20261020-030936_CMNS3500-P3-DISCOVERY-01.md`.
Controlling scope: `research-design.md` (not changed).

This report describes source **availability only**. It contains no SFL coding, no CDA and no historical interpretation. It does not select a corpus. The historical record is **not** complete. A failed search is not proof that a document does not exist.

## 1. Outputs

| File | Content |
|---|---|
| `corpus/originals/source_index.csv` | Canonical discovery register. 1,711 candidate rows. All `include` cells are blank. |
| `corpus/originals/authors.csv` | 755 name occurrences (195 distinct recorded names) from collected documents. |
| `corpus/originals/<Region>/<source_class>/` | 929 retrieved original files (1.98 GB), unchanged. |
| `scripts/polite_fetch.py` | Rate-limited fetch helper used for every HTTP request. |
| `scripts/collect.py` | Downloads candidates, checks files, writes the index. |

## 2. Counts

### 2.1 By acquisition status

| Status | Rows | Meaning |
|---|---|---|
| DOWNLOADED | 916 | File retrieved, type checked, SHA-256 recorded. |
| DOWNLOADED_INCOMPLETE | 13 | File retrieved but truncated at 1,048,576 bytes. The PDF does not parse. See §6. |
| METADATA_ONLY | 729 | Located but not retrieved. 681 of these were not retrieved because the 2 GB budget was reached. The rest are catalogue records, metadata-only listings or unfetched leads. |
| UNAVAILABLE | 28 | A link or citation exists, but no retrievable copy was found. |
| ACCESS_RESTRICTED | 14 | Login, robots.txt, bot challenge or Google Drive. Not bypassed. |
| DOWNLOAD_FAILED | 11 | HTTP error, DNS failure or timeout. |
| **Total** | **1,711** | |

### 2.2 By region

The region is the region the record concerns. `Multi_Region` holds provincial records that cover several regions.

| Region | Candidates | Retrieved files | MB |
|---|---|---|---|
| Vancouver_Island | 322 | 239 | 418 |
| Thompson_Okanagan | 190 | 109 | 156 |
| Kootenay_Rockies | 260 | 165 | 310 |
| Northern_BC | 474 | 162 | 444 |
| Cariboo_Chilcotin_Coast | 311 | 141 | 259 |
| Multi_Region | 154 | 113 | 395 |

### 2.3 By source class (where the file was actually retrieved from)

| Source class | Candidates | Retrieved |
|---|---|---|
| official_sites | 566 | 334 |
| wayback_machine | 824 | 352 |
| government_archives | 192 | 174 |
| library_archives | 73 | 43 |
| other_public_sources | 56 | 26 |

472 Wayback rows are **identified through archive metadata only** (CDX listings, not retrieved). 25 library rows are catalogue records without an online file.

### 2.4 By decade of publication (evidenced publication year only)

| Decade | Candidates | Retrieved |
|---|---|---|
| before 1980 | 3 | — |
| 1980s | 28 | 20 |
| 1990s | 13 | 7 |
| 2000s | 200 | 80 |
| 2010s | 236 | 158 |
| 2020s | 421 | 210 |
| unknown | 809 | 454 |

809 rows have no publication year. For most of them the year is unknown because the agents recorded years only from printed evidence, link text or filenames, and never from capture dates. Many of these rows can be dated when a person reads the files.

## 3. Search methods

### 3.1 Platforms and archives
- **Web search:** the WebSearch tool, 365 logged queries.
- **Internet Archive Wayback Machine:** CDX API queries by domain, mimetype and path, and raw-capture (`id_`) retrieval. Internet Archive item search ("microlog" collection).
- **Official sites:** page inspection and WordPress media listings (krtourism.ca, industry.landwithoutlimits.com, travelnbc.com).
- **Government:** Destination BC corporate documents page, BC government news and budget sites, BC Hansard (lims.leg.bc.ca), regional district agendas (RDBN), City of Nanaimo.
- **Library and archives:** UBC Open Collections, arcabc.ca historical newspaper collections, UNBC, TRU, MemoryBC, BC Archives, WorldCat, Canadiana and LAC (access results are in §6).

The search logs hold 640 entries in total; 310 were marked not usable.

### 3.2 Domains examined (main)
- **Vancouver Island:** 4vigroup.com (live), forvi.ca, tourismvi.ca, islands.bc.ca, vancouverisland.travel. Not resolved or not verified: 4vi.ca, 4vi.org, 4tvi.ca, tourismvancouverisland.ca/.com.
- **Thompson Okanagan:** totabc.org, news.totabc.org (no longer resolves), totabc.com, thompsonokanagan.com. No captures: okanagan-similkameen.com, okanagansimilkameen.com.
- **Kootenay Rockies:** krtourism.ca, kootenayrockies.com, bcrockies.com. kootenaycountry.com is a private community site, not an association site.
- **Northern BC:** travelnbc.com, nbctourism.com, northernbctourism.bc.ca, northernbctourism.com, northernbctravel.com.
- **Cariboo Chilcotin Coast:** landwithoutlimits.com (and its industry. and media. subdomains), cariboocountry.org, cariboocountry.com, cariboochilcotincoast.com. No captures: cccta.ca, cariboochilcotincoast.ca.
- **Provincial:** destinationbc.ca, tourism.bc.ca, tourismbc.com, archive.org (microlog), news.gov.bc.ca, bcbudget.gov.bc.ca.

### 3.3 Main query patterns
- `"<organization name or historical name>" "<document type>"`: annual report, strategic plan, business plan, bylaws, board of directors, annual general meeting, financial statements.
- `"<organization name>" filetype:pdf`, plus `site:` queries on official and archive domains.
- Year-specific and decade-specific queries for 1985–1995, 1996–2005, 2006–2015 and 2016–2026.
- Wayback CDX: `url=<domain>/*`, filtered on `mimetype:application/pdf` and `statuscode:200`, collapsed by digest. HTML path queries for `about`, `board`, `annual` and `governance` pages.

### 3.4 Name-expanded searches (pass two)
- Agents extracted names of authors, signatories, editors, executives and board chairs from the downloaded documents, with page references. Excerpts came from `pdftotext` page text, selected by role keywords.
- Each name was combined with organization names (current and historical), role, period and publication terms. 164 name queries were run.
- The pass found **34 additional candidate documents**: 15 retrieved, 8 metadata-only, 9 unavailable, 2 failed. Most are news items about chairs and CEOs, the 2003 Hansard record of the "Tourism Rockies" name change, and archived TOTA staff pages from 2004–2009.
- Every recorded name was machine-checked against the extracted text of its cited source. All 755 rows matched.

## 4. Historical organization names discovered

This table lists names as the evidence states them. Confidence is the agent's assessment of the evidence. It does not establish legal succession.

| Region | Name / form | Evidence period | Confidence | Note |
|---|---|---|---|---|
| VI | Tourism Association of Vancouver Island (TAVI) | 1998–2026 | HIGH | Legal name. Current "dba 4VI Group". |
| VI | Tourism Vancouver Island (TVI) | 2002–2022 | HIGH | Operating name. |
| VI | 4VI; 4VI Group; 4TVI | 2022–2026 | MEDIUM–HIGH | 4TVI is "formerly Tourism Vancouver Island". |
| VI | Vancouver Island/Coast Tourism Task Force | 1991 | LOW | Corporate author of the 1991 strategy. Not a predecessor body. |
| VI | Tourist Trade Development Association of Victoria and Vancouver Island | 1935–36 | LOW | No evidenced link to TAVI. |
| TO | Okanagan Valley Tourist Association | not dated | MEDIUM | First name, per the TOTA about page. |
| TO | Okanagan(-)Similkameen Tourist Association (OSTA) | to 1997; Hansard 1993–94 | HIGH | Variant "…Tourism Association" in c.1991–93 ads. |
| TO | Thompson Okanagan Tourism Association (TOTA) | 1997–2026 | HIGH | Founded 1957 and incorporated 1963 (about page). A search snippet gives 1965. Not resolved. |
| KR | Kootenay Boundary Visitors Association (KBVA) | c.1978–1985 | LOW | OCR newspaper only. |
| KR | Kootenay Country Tourist Association (KCTA) | formed March 1985; 1986 | MEDIUM–HIGH | 2013 news: "melded into" KRT. Date not established. |
| KR | Rocky Mountain Visitors Association (RMVA) | 1987 (reported 2012) | MEDIUM | |
| KR | Tourism Rockies | 1998–2003 | MEDIUM | 2003 Hansard: "Kootenay" added to the name in March 2003. |
| KR | Kootenay Rockies Tourism (Association) (KRT/KRTA) | 2003–2026 | HIGH | |
| NB | Unnamed Yellowhead Highway business group, "first formed in 1976" | 1976 | MEDIUM | Name not stated. A 1977 Hansard entry names a "Yellowhead Travel Association"; its link to NBCTA is not established. |
| NB | Northern British Columbia Tourism Association / Northern BC Tourism (NBCTA) | 1999–2026 | HIGH | Smithers office, moved to Prince George in 2000. |
| CC | Cariboo Tourist Association | 1991 | LOW | One secondary mention. |
| CC | Cariboo Tourism Association (CTA) | 1998–2001 | MEDIUM | |
| CC | Cariboo Chilcotin Coast Tourism Association (CCCTA) | 2001–2026 | HIGH | "Founded 1962" claim; the 1962 name is not evidenced. |
| CC | Cariboo Chilcotin Coast Tourism Marketing Association (CCCTMA) | 2018–2026 | HIGH | Separate sister society. |
| Prov. | Tourism British Columbia → Destination British Columbia | 1981–2009 → 2012– | HIGH | Provincial body, not a regional organization. |

1980s provincial reports name the tourism **regions** of that period (for example "North by Northwest", "Peace River-Alaska", "High Country", "Kootenay Country", "Rocky Mountain"). These are region designations. They are not evidence of association names.

## 5. Coverage gaps

### 5.1 Years
Each regional organization has dated records for 22–30 of the 42 years from 1985 to 2026. The largest gap for every region is **1985–1998**. Records from that period are mostly provincial strategies and reports (Internet Archive microlog), Hansard index entries and newspaper OCR. The organizations' own documents from 1985–1997 are almost absent.

| Region | Years with no dated record, 1985–2026 |
|---|---|
| Vancouver_Island | 1985–87, 1989–90, 1992–97, 1999, 2008, 2025 |
| Thompson_Okanagan | 1985–87, 1989–98, 2000, 2002–03, 2006–08, 2014, 2018 |
| Kootenay_Rockies | 1985, 1987, 1989, 1991–97, 1999–2001, 2007–08, 2010 |
| Northern_BC | 1985–87, 1989–90, 1992–98, 2008, 2010, 2013, 2015 |
| Cariboo_Chilcotin_Coast | 1985–86, 1989–2002, 2010–11, 2015 |

This table is based only on the evidenced `publication_year`. The 809 undated rows may fill some of these years.

### 5.2 Document types
- **Annual reports:** few in every region. KR has one (FY15). CC has annual service reports for 2019–20, 2020–21 and 2022–23. VI has none before the 2023 Impact Report. NB has none. TO has no corporate annual report (it has INSTO observatory reports for 2020–2025).
- **Audited financial statements:** CC (CCCTA and CCCTMA) and KR (FY21/22 on) only. None were found for VI, TO or NB.
- **Board minutes:** NB 2001–2007 and CC 2003 (Wayback). None public for the other regions.
- **Board rosters:** gaps are uneven. KR has no board page archived for 2013–2021. VI and NB leadership for 1995–2001 and 2005–2008 is not documented online.
- **Provincial–regional contracts:** Destination BC regional contracts exist for all five organizations from FY2013/14 to FY2026/27.

## 6. Access restrictions and failures
- **Not bypassed:**
  - MemoryBC: JavaScript bot challenge.
  - Canadiana, LAC Aurora and WorldCat: robots.txt disallows.
  - Destination Canada PDF: probable bot check.
  - search.nbca.unbc.ca: HTTP 403.
  - Members-only and login pages: CCCTA 2006, NBCTA 2006.
  - Google Drive links (TOTA bylaws, AGM agenda, INSTO reports, climate action plan): recorded as ACCESS_RESTRICTED and not fetched.
- **Not reachable:**
  - BC Archives: SSL certificate error.
  - bchdp-i2.arcabc.ca and news.totabc.org: DNS failure.
  - unwto.org: HTTP 530.
  - UBC Open Collections: JavaScript app, nothing usable returned.
- **Truncated files:** 13 Wayback files end at exactly 1 MiB and do not parse (12 NB files, including the 2021–24 strategic plan, and the VI FY20 business plan). They are marked `DOWNLOADED_INCOMPLETE`. Alternate URLs are recorded. They were not re-fetched because of the budget.
- **Archived links with no capture:** for example the CCCTA 2006 Constitution, 2007 Governance Manual and FY09 business plan, and the TOTA 2017 bylaws.

## 7. Download budget and remaining work
- The 2 GB budget was reached: 1,982,683,550 bytes in 929 files. No more downloads were made.
- **Download order:** the PRIORITY A–C document types (prompt §6) were downloaded first, with each host processed in parallel. Then the remaining budget went to Vancouver Island, which had the fewest retrieved files. PRIORITY D items (newsletters, visitor guides, other institutional publications; 455 candidates) were indexed but not downloaded.
- **Remaining work:**
  1. Download the 681 budget-skipped rows. About 250 of them are PRIORITY A–C, mostly NB, CC and KR live-site files.
  2. Re-fetch the 13 truncated files from their alternate URLs.
  3. Read the undated files to establish publication years.
  4. Search BC Registries society filings (not checked).
  5. Search sessional papers and Hansard in more depth.
  6. Locate pre-1998 records of the regional bodies in print archives.
  7. Check the unresolved leads in §8.

## 8. Unresolved leads
- **VI:** the 1991 Vancouver Island/Coast task force; the meaning of the "TAS-2012" files; the other party to agreement "C22G240010"; who owns tourismvancouverisland.com.
- **TO:** the 2012 strategy "Embracing Our Potential"; the 1957, 1963 and 1965 founding dates; the 1987–88 and 1993–94 Hansard debates; the 2009 Tourism BC partnership PDFs.
- **KR:** the date of the KCTA merger into KRT; Wayback board pages (1999–2004 and 2009–2013, mostly not read); powderhighway.com; page images of the Castlegar News OCR.
- **NB:** the 1976 founding name; the Yellowhead Travel Association and its relation to NBCTA; the Prince George Citizen board articles; a 2010 talk on how BC's tourism regions developed.
- **CC:** the FY16–18 Destination BC agreement link; the 2012 Central Coast Regional District minutes; the 1991 "Cariboo Tourist Association".
- **Provincial:** BC Sessional Papers item IDs; the archived corporate.hellobc.com site; 10 image-only Tourism BC regional PDFs with no title or date; one FY13/14 contract whose label and filename do not match.

## 9. Technical decisions (open for review)
These are implementation choices, not methodology. They need your review.
1. **Source ID format:** `<REGION>_<YEAR|nd>_<Descriptor>[_NN]`, with region codes VI, TO, KR, NB, CC and MR. The year is the evidenced publication year, otherwise `nd`. An ID does not change when a date is later corrected.
2. **`Multi_Region/` folder:** added because 113 retrieved provincial records cover several regions. The prompt structure has no place for them. This folder is a deviation from that structure.
3. **Extra index columns** after the required columns: `archive_capture_date`, `date_evidence`, `title_basis`, `file_size_bytes`, `found_by`. They keep capture dates and publication dates separate and record the basis of each date and title.
4. **Additional status `DOWNLOADED_INCOMPLETE`**, for the truncated files (§6).
5. **Identical files** (same SHA-256) are stored once. The extra URLs are added to `alternate_urls`. At least 25 identical copies were merged this way. No row uses `duplicate_of`, because no non-identical duplicate was confirmed.
6. **Name records** are one row per name occurrence (name × source). People with the same name are not merged.
7. **Metadata from listings:** titles and years come from listings, link text or filenames unless `title_basis` says otherwise. The PDFs were not read for metadata in this task.

## 10. Limitations
- AI agents (Claude) did the searches and recorded the candidate metadata. A human has not reviewed any row. Treat `metadata_confidence` as an agent assessment.
- Search-engine results are incomplete and ranked. Ranking was not used as evidence of relevance.
- Wayback coverage depends on what the crawler captured. A missing capture does not mean that a document was never published.
- 211 retrieved PDFs have little or no text layer (scans). Names in them were not extracted.
- Extracted text was used only to find names and to check them. It was kept outside the project and is not a treated corpus.

## 11. Validation (2026-10-20)

| Check | Result |
|---|---|
| Prompt saved in `prompts/` | Yes |
| `source_index.csv` and `authors.csv` exist | Yes |
| All indexed local files exist | Yes (929 of 929). No unindexed files. |
| Checksums verified | 929 of 929 match |
| Duplicate files | None (no repeated SHA-256 on disk or in the index) |
| Publication date equal to capture date | 0 rows |
| Every row has an original or archive URL | Yes |
| `include` column | Blank in all 1,711 rows |
| Protected files (`research-design.md`, `methodology.md`) | Unchanged (SHA-256 compared) |
| SFL coding or CDA performed | No |
