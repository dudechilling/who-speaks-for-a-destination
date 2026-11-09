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

## Publication and fair-dealing assessment

The public [coded corpus](RDMO_about_coding_review.xlsx) reproduces **3,130 words of original wording** in 194 clause rows across ten public-facing organizational pages (95–656 words per page in the selected analytical text). The corresponding normalized clauses repeat the linguistic content in a comparable form. The workbook contains no full HTML pages, site images, navigational material or advertising. Source identifiers, retrieval dates and original URLs appear in its Index and [corpus/sources.csv](corpus/sources.csv).

**Basis asserted:** Section 29 of Canada's [Copyright Act](https://laws-lois.justice.gc.ca/eng/acts/C-42/section-29.html) recognizes fair dealing for research and education. The Supreme Court of Canada's *CCH Canadian Ltd. v. Law Society of Upper Canada* framework requires a context-dependent assessment, not a fixed word limit. The six factors, applied here, are:

- **Purpose:** Non-commercial undergraduate research, clause-level analysis and independent verification support fair dealing.
- **Character:** GitHub makes the excerpts available indefinitely and worldwide. Broad redistribution weighs **against** fairness, compared with a private research copy.
- **Amount:** The published corpus is limited to institutional explanations and excludes unrelated content, but some historical About pages are short and the selected excerpts can constitute a substantial portion of the relevant page. This weighs **against** fairness.
- **Alternatives:** Links, source anchors or code-only tables would reduce copying but would not preserve the precise linguistic evidence necessary to evaluate segmentation, classification and normalization, particularly for historical captures. This favours the limited analytic use, although less-reproductive alternatives exist.
- **Nature:** The sources are publicly accessible statements of institutional purpose and representation, predominantly factual/promotional rather than confidential or commercially sold texts. This supports fair dealing.
- **Effect:** No paid market for these About-page statements or demonstrated substitution has been identified. This favours fairness, but unknown commercial or reputational effects cannot be ruled out.

**Assessment:** The focused educational research and reproducibility purpose provides a plausible case-specific fair-dealing argument, though public, indefinite redistribution of substantial excerpts creates meaningful residual risk. This rationale is **not** a claim of permission, a blanket licence, or a definitive legal finding. The original publishers retain their respective rights; their website terms may create separate obligations. The dataset's public status does not establish a right for others to redistribute its source-text columns. Concerns about reproduction should be examined and addressed with source owners; the researcher may need to withdraw or revise distribution if a claim is substantiated.

The workbook remains **machine-coded and pending human adjudication**. Publication documents the candidate dataset, not agreement with any proposed process, participant, modality or representation note. All original source captures remain private.
