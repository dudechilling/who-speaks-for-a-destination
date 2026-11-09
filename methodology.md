# Methodology

## Scope and change in design

This study compares institutional language in ten fixed About webpages: one historical and one contemporary page for five British Columbia regional destination marketing organizations. It asks how each page explains organizational identity, work, constituents or beneficiaries, responsibilities, and claimed institutional authority.

The original October proposal described three linked datasets on language, governance, and performance. That proposal was replaced on 2026-11-09 with this narrower study because a bounded, reproducible clause corpus can answer the linguistic question without treating promotional self-description as evidence of actual authority. Board composition, director affiliations, membership eligibility, voting rights, governance arrangements, and decision-making authority are outside this phase.

## Sources and preservation

The exact URLs, capture or retrieval dates, and SHA-256 values are in `corpus/sources.csv` and the workbook Index. All ten requested pages were retrieved on 2026-11-09. Historical captures are identified by their Internet Archive Memento timestamps. Publication dates are recorded only where independently established; none was established for these pages.

Complete originals are private research copies. The public repository does not include them. The workbook Index records included and excluded source sections, material limitations, and identity/continuity cautions for every page.

Historical and contemporary names are not treated as legally identical by default. In particular, the historical Cariboo Tourism Association is not assumed to be the same legal entity as either current Cariboo association, and the historical Tourism Vancouver Island page is not assumed to establish continuity with the current 4TVI/4VI wording.

## Inclusion and segmentation

Coding includes substantive statements about organizational identity and purpose; mission, mandate, actions, responsibilities, or commitments; stakeholders, members, beneficiaries, and communities; and self-reported representation or institutional authority. Navigation, advertising, directories, cookie notices, duplicated site furniture, and unrelated geographic promotion are excluded. For the extensive 4TVI page, general mission, commitment, ongoing support, and destination-service explanations are included; individual project case studies are excluded. The exact decisions appear in the workbook Index.

The unit is normally a grammatical clause. Independent processes are separated where that retains meaning. A short clause complex stays intact if a split would damage attribution, negation, modality, conditional meaning, or the central institutional claim. Clauses stay in source order. Headings and fragments are not treated as clauses unless they provide a necessary grammatical stem for an institutional statement.

## Normalization and coding

`original_clause` preserves source wording, capitalization, punctuation, numbers, and names after HTML entity decoding and source-layout whitespace collapse. `normalized_clause` applies NFKC, lowercase, replacement of punctuation and symbols with spaces, whitespace collapse, and trimming. It preserves word order, numbers, diacritics, and negation. The source wording, not the normalized form, is used for coding.

Each clause receives one machine-proposed process type: `material`, `relational`, `verbal`, `mental`, `existential`, or `unclear`; one primary grammatical participant copied from the original wording or `not stated`; and one modality value: `none`, `possibility`, `commitment`, `obligation`, or `unclear`. A representation note records only a plain-English observation of the page’s own claim; it never infers formal power. Coding notes retain segmentation or classification uncertainty.

## Review status and limits

All workbook rows are machine-proposed and marked `pending_human_review`. No classification is adjudicated. Clauses are nested within pages, so the study does not treat them as independent samples of organizations or periods.

The material records institutional self-description, not independently verified organizational facts. The historical comparison is limited by changing websites, archive availability, names, and unknown legal continuity. Current pages can also change after retrieval.

## Public release

The workbook reproduces eligible third-party webpage clauses. The reviewed materials did not establish a public redistribution basis for the complete XLSX. Private research analysis is therefore distinct from public release. Before publication, the project needs documented permission, a relevant license, or a case-specific fair-dealing assessment that supports worldwide distribution of the complete workbook. Until then, the complete workbook is preserved locally and the public repository must not imply that it has been released or human-approved.
