# Who speaks for a destination?

**Research status — 2026-11-09:** Revised institutional-language methodology and ten-source register are public. Machine coding is complete locally, but human adjudication and permission to release the complete full-text workbook remain open.

This CMNS 3500 project asks how five British Columbia regional destination marketing organizations explain what they are, what they do, whom they represent or benefit, and the responsibilities or institutional authority they claim.

It compares one historical and one contemporary About page for Northern BC, Cariboo Chilcotin Coast, Thompson Okanagan, Kootenay Rockies, and Vancouver Island. The ten fixed pages and their capture details are in [corpus/sources.csv](corpus/sources.csv). Readers can use the recorded URLs to locate the original webpages.

The earlier repository proposed three datasets covering public language, governance, and performance. On 2026-11-09, that broad proposal was deliberately replaced by this bounded institutional-language study. The earlier snapshot is preserved on the [`archived`](https://github.com/dudechilling/who-speaks-for-a-destination/tree/archived) branch. This change is not presented as part of the original October plan.

Each eligible institutional explanation was read before clause segmentation. A row normally represents a grammatical clause. Short clause complexes remain together where separating them would damage attribution, negation, modality, a condition, or the main institutional claim. The workbook keeps the exact source wording and a deterministic normalized version: Unicode NFKC, lowercase, punctuation and symbols changed to spaces, whitespace collapsed, then trimmed. [scripts/normalize_clauses.py](scripts/normalize_clauses.py) implements that rule.

The workbook proposes only two SFL metafunctions: ideational process type and primary grammatical participant, plus interpersonal modality. A short representation note records what the page says about representation, service, inclusion, or benefit. It does not establish actual board composition, membership rights, voting rights, governance arrangements, or decision-making authority.

The canonical `RDMO_about_coding.xlsx` workbook is complete **locally** (194 machine-coded clauses across ten source worksheets, all `pending_human_review`). It is not yet published here because redistribution of the source text has not been cleared. The workbook remains available for human review on the m710; no coding is represented as approved.

The complete workbook remains preserved locally in the task-owned worktree and an independent review copy; it is not publicly released yet. The source review found no documented basis for distributing all reproduced webpage clauses worldwide in a public XLSX: current Northern BC and Kootenay Rockies terms expressly restrict copying or redistribution, and the other sites did not provide an applicable redistribution grant in the reviewed material. The exact captures remain private. Public release requires documented permission, an applicable license, or a case-specific fair-dealing decision that covers the complete workbook; it must not be replaced with an altered corpus.

The historical/contemporary pairings are linguistic comparisons, not proof of legal continuity. The historical Cariboo page names the Cariboo Tourism Association; the current page distinguishes development/sustainability and marketing associations. The Vancouver Island current page uses 4TVI within the 4VI Group. Those distinctions remain explicit rather than resolved by assumption.

Governance research is a future, separate phase. This repository stops with the institutional-language workbook ready for human review.
