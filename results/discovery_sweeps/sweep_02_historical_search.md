# Sweep 2 — Historical archive search

Task: CMNS3500-P3-DISCOVERY-02.
Execution: 2026-10-20.
- Search agents: 08:35–09:28 UTC.
- Controller: 09:28–09:35 UTC.
- Checks and publication followed.

Previous checkpoint: sweep 1, commit `fe52ec06e3b9cbdb8ca2221792ff40aae9391c4f`.

Agent instructions, saved word for word:
- `prompts/20261020-083520_CMNS3500-P3-DISCOVERY-02_sweep2-agent-brief.md`
- `prompts/20261020-083520_CMNS3500-P3-DISCOVERY-02_sweep2-dispatch.md`

Raw agent records:
- `results/discovery_records/sweep2/*_candidates.jsonl`
- `*_searchlog.jsonl`
- `*_leads.jsonl`

## 1. Search areas and source types
Six agents ran: one per region and one for provincial records. They concentrated on 1985–1998, then on the 1999–2012 gaps, using every documented historical name variant and officer name.

| Source type | Coverage |
|---|---|
| Official sites | Live pages, and archived pages via Wayback CDX by domain and path: islands.bc.ca, tourismvi.ca, totabc.com, bcrockies.com, krtourism.ca, nbctourism.com, landwithoutlimits.com, tourism.bc.ca, tourismbc.com |
| BC Hansard | Subject indexes 1984–2001 and individual sittings |
| Government publications | Internet Archive "microlog" collection; bcbudget service plans; federal grants and contributions disclosures |
| Regional district records | Bulkley-Nechako, Central Coast and others |
| Historical newspapers | arcabc.ca OCR text (Castlegar News, Terrace Standard, Prince George items and others) |
| Library and archive catalogues | Results are in §5 |

Agents did not download files. The controller registered the candidates and downloaded them under the same access rules as sweep 1.

## 2. Queries and retrieval attempts

| Measure | Sweep 2 |
|---|---|
| Logged search actions | 327 (132 marked usable) |
| Candidate records proposed by agents | 180 |
| Repeated results merged into existing rows | 19: 18 by URL, 1 by identical file. **Not** counted as new. |
| **New candidate rows** | **161** |
| Retrieval attempts logged | 158 |
| New complete downloads | 150 new rows + 5 existing rows = 155 |
| Existing UNAVAILABLE rows recovered | 4 of 5. These are arcabc OCR items on the dead host `bchdp-i2.arcabc.ca`, retrieved from the same path on `bchdp.arcabc.ca`. 1 returned the wrong type. |
| Other existing rows newly downloaded | 1 (the CCCTA FY16–18 Destination BC agreement, via a newly found Wayback capture) |
| Incomplete files recovered | 0 (none were queued in sweep 2) |
| Additional downloaded bytes | 164,073,308 |
| Publication dates verified | 0 existing rows. Scheduled for sweep 3; new rows carry agent `date_evidence`. |
| Unresolved leads recorded | 59 (see §5) |

## 3. New candidates

| By region | Rows |
|---|---|
| Multi-region (provincial) | 48 |
| Vancouver Island | 38 |
| Northern BC | 29 |
| Thompson Okanagan | 23 |
| Kootenay Rockies | 17 |
| Cariboo Chilcotin Coast | 6 |

| By evidenced decade | Rows | Downloaded |
|---|---|---|
| 1980s | 19 | 19 |
| 1990s | 33 | 33 |
| 2000s | 38 | 32 |
| 2010s | 9 | 8 |
| 2020s | 8 | 8 |
| unknown | 54 | 50 |

| By source class | Rows |
|---|---|
| wayback_machine | 79 |
| government_archives | 54 |
| library_archives | 15 |
| other_public_sources | 12 |
| official_sites | 1 |

## 4. Historical gaps addressed
Evidence for 1985–1999 grew in every region. Most of it is **not** the associations' own documents: Hansard sittings and indexes, newspaper OCR items and provincial ministry publications. Records the associations produced themselves remain rare before 1998.

**Region × period, downloaded complete files** (before → after sweep 2):

| Period | VI | TO | KR | NB | CC | Provincial |
|---|---|---|---|---|---|---|
| 1985–1989 | 1 → 3 | 2 → 5 | 3 → 10 | 2 → 5 | 2 → 2 | 6 → 10 |
| 1990–1994 | 2 → 2 | 0 → 4 | 1 → 4 | 1 → 5 | 0 → 0 | 3 → 3 |
| 1995–1999 | 1 → 15 | 1 → 2 | 1 → 1 | 1 → 5 | 0 → 0 | 2 → 5 |

What the new evidence contains:
- **Vancouver Island:** 1998–99 islands.bc.ca pages (board lists 1998-99 and 1999/2000, the 1999 AGM notice, newsletters, inquiry and web statistics, a December 1998 executive-director letter); 2008 board pages; Hansard sittings of 1985, 1989 and 1992 that name TAVI.
- **Thompson Okanagan:** Hansard sittings of 1988–1995 naming OSTA, and a "High Country Tourist/Tourism Association" (1989, 1992), whose relation to TOTA is **not established**. Also totabc.com membership files, and a Spring 2006 newsletter.
- **Kootenay Rockies:** Castlegar News items on the Kootenay Country Tourist Association (1985–1992); Tourism Rockies board rosters for 1999/2000 to 2001/03; KRT rosters for 2009–11 and 2011–13; newsletters 2005–2007; AGM notices 2010–2011.
- **Northern BC:** Hansard 1989–1997 naming the "North-By-Northwest Tourism Association of B.C." and the "Peace River Alaska Highway Tourist Association". Their relation to NBCTA is **not evidenced**. A 2000 Terrace Standard item calls NBCTA "three-year-old" and describes "North by Northwest" as a Tourism B.C. region. That is evidence about a region name, not about succession. Also the nbctourism.com 2006–07 board roster and newsletters 2006–2008.
- **Cariboo Chilcotin Coast:** no 1985–1998 record found. 2001 government and sub-regional studies; 2017 Central Coast Regional District items.
- **Provincial:**
  - Ministry program directory (1986) and *Tourism development* (1987).
  - The ministry's 2001–04 performance plan.
  - Hansard 1997, first reading of the Tourism British Columbia Act.
  - Tourism BC program guides 2004–07, year-in-review 1999 and 2000, regional contact lists and the 2009 regional funding page.
  - Ministry annual service plan reports 2001/02–2009/10.
  - COTA annual reports 2003–09.

**Not addressed:**
- No annual report, financial statement or strategic plan of any regional association from 1985–1998 was located.
- No Cariboo record exists before 1999.

## 5. Remaining unresolved leads (59)

| Status | Count | Examples |
|---|---|---|
| not located | 43 | Tourism BC annual reports 1997/98 and 1999/2000; ministry annual reports 1989/90–1997/98; Hansard 1992, 1993, 1996 and 1997 debates named in the subject indexes; Partners in Tourism contracts with the regional associations (1991–93); the 1997 change from nine regions to six; date of the KCTA's absorption into KRT; KCTA 1988/89 marketing plan; TAVI 1999 business plan; TVI Board Policy Manual 2007 |
| physical access needed | 7 | Williams Lake Tribune 1962–2002; Kelowna Daily Courier and Capital News; Nanaimo newspapers; RMVA records 1987–1997; Selkirk College Archives; BC Archives fonds PR-2243 |
| catalogue only | 4 | BC Archives series GR-3558; Columbia Basin Institute collection; *Gold Country 86* supplement; federal grants records |
| permission needed | 3 | Quesnel Cariboo Observer (Newspapers.com); Times Colonist archive; CCCTA 2006 Constitution, 2007 Governance Manual and FY09 business plan (no copy outside the defunct members area) |
| paid access | 2 | BC Registries society filings (incorporation, name changes, director lists) for TOTA and CCCTA |

A lead is a reference, not proof that a document survives. The leads files record the evidence for each one.

## 6. Access problems (none bypassed)
- **BC Archives search:** SSL certificate error, again.
- **Bot challenges:** arcabc record pages and the UBC RBSC archive catalogue.
- **robots.txt disallows:** OrgBook BC API.
- **UBC Open Collections:** IT block page.
- **BC Gazette site:** expired certificate.
- **energeticcity.ca:** HTTP 403.
- **Newspapers.com:** gated.
- **Wayback CDX:** occasional 503/504 errors; narrower retries succeeded.

## 7. Inventory after sweep 2

| Status | After sweep 1 | After sweep 2 | Change |
|---|---|---|---|
| DOWNLOADED | 1,512 | 1,667 | +155 |
| DOWNLOADED_INCOMPLETE | 2 | 2 | 0 |
| DUPLICATE | 9 | 9 | 0 |
| METADATA_ONLY | 24 | 24 | 0 |
| ACCESS_RESTRICTED | 119 | 120 | +1 |
| DOWNLOAD_FAILED | 17 | 19 | +2 |
| UNAVAILABLE | 28 | 31 | +3 |
| **Total candidates** | 1,711 | 1,872 | +161 |

Additional bytes in this task so far: 1,881,415,995 of the 4,000,000,000 authorized.

Downloaded files are candidates only. None is researcher-approved.

## 8. Verification (`scripts/validate_inventory.py`, compared with sweep 1)
All checks passed.

| Check | Result |
|---|---|
| Indexed files exist and checksums match | 1,671 of 1,671 |
| Files on disk accounted for | 1,719: 1,671 indexed and 48 superseded truncated files |
| Duplicate files | none |
| Source IDs removed or duplicated | none |
| Rows without a URL | none |
| Dated rows without `date_evidence` | 0 of 1,009 |
| Publication date equal to capture date | none |
| Failed or restricted rows without a reason | none |
| Author links | valid |
| `include` / `selection_notes` changed | none; all `include` cells are blank |

New PDFs were checked with `pdfinfo` when they were stored; the full PDF re-check runs at the final validation. The public author copy is unchanged; new name records are scheduled for sweep 3. The privacy and secrets check (`scripts/prepublish_check.py`) passed before the commit.
