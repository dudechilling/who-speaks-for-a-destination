# Who speaks for a destination?

**Research status — 2026-11-09:** Revised institutional-language methodology, ten-source register and the [public coded corpus](RDMO_about_coding_review.xlsx) are available. All 194 proposed clause classifications remain **pending human review**.

This CMNS 3500 project asks how five British Columbia regional destination marketing organizations explain what they are, what they do, whom they represent or benefit, and the responsibilities or institutional authority they claim.

It compares one historical and one contemporary About page for Northern BC, Cariboo Chilcotin Coast, Thompson Okanagan, Kootenay Rockies, and Vancouver Island. The ten fixed pages and their capture details are in [corpus/sources.csv](corpus/sources.csv). Readers can use the recorded URLs to locate the original webpages.

The earlier repository proposed three datasets covering public language, governance, and performance. On 2026-11-09, that broad proposal was deliberately replaced by this bounded institutional-language study. The earlier snapshot is preserved on the [`archived`](https://github.com/dudechilling/who-speaks-for-a-destination/tree/archived) branch. This change is not presented as part of the original October plan.

Each eligible institutional explanation was read before clause segmentation. A row normally represents a grammatical clause. Short clause complexes remain together where separating them would damage attribution, negation, modality, a condition, or the main institutional claim. The workbook keeps the exact source wording and a deterministic normalized version: Unicode NFKC, lowercase, punctuation and symbols changed to spaces, whitespace collapsed, then trimmed. [scripts/normalize_clauses.py](scripts/normalize_clauses.py) implements that rule.

The workbook proposes only two SFL metafunctions: ideational process type and primary grammatical participant, plus interpersonal modality. A short representation note records what the page says about representation, service, inclusion, or benefit. It does not establish actual board composition, membership rights, voting rights, governance arrangements, or decision-making authority.

The [**RDMO_about_coding_review.xlsx**](RDMO_about_coding_review.xlsx) workbook is the public, machine-coded corpus: 194 clause rows across ten document worksheets and an Index. Its `original_clause` values reproduce selected website text; `normalized_clause` gives the deterministic transformation. All codes are proposals, not reviewed research findings. The published file is a byte-identical copy of the original Codex workbook, not a revised/adjudicated dataset. The `review` filename identifies its intended use, **not** an already-completed review.

**Source-text rights:** The corpus is published for non-commercial academic research and auditability under a documented, case-specific Canadian fair-dealing rationale ([methodology](methodology.md#publication-and-fair-dealing-assessment)). This is an assessment, not a licence from the original publishers or a guarantee against a copyright challenge. Worldwide availability weighs against fairness; original site terms and other rights may also apply. The quoted language belongs to its original publishers. No permission to reuse their text is granted by this repository. Every source is attributed and linked in [corpus/sources.csv](corpus/sources.csv) and the workbook Index. Full HTML captures remain private.

The historical/contemporary pairings are linguistic comparisons, not proof of legal continuity. The historical Cariboo page names the Cariboo Tourism Association; the current page distinguishes development/sustainability and marketing associations. The Vancouver Island current page uses 4TVI within the 4VI Group. Those distinctions remain explicit rather than resolved by assumption.

Governance research is a future, separate phase. This repository stops with the institutional-language workbook ready for human review.
