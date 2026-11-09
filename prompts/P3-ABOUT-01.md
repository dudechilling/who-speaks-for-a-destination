# P3-ABOUT-01 — Archive Previous Research and Build the Institutional Language Corpus

**Project:** Who speaks for a destination?  
**Course:** CMNS 3500 — Project 3  
**Execution environment:** Alfred m710  
**Repository:** https://github.com/dudechilling/who-speaks-for-a-destination  
**Required workbook:** `RDMO_about_coding.xlsx`

## 1. Objective

Replace the active repository's previous research structure with a focused, reproducible study of institutional language.

Preserve the previous public repository on a Git branch named `archived`.

Create one Excel workbook containing clause-level Systemic Functional Linguistics (SFL) coding for ten organizational webpages.

**The completed workbook must be included in the public GitHub repository.** It is not a private working file or a supplementary export.

The workbook will contain machine-proposed coding. Human adjudication will occur later.

This research phase examines how five British Columbia regional destination marketing organizations (RDMOs) explain:

1. What they are.
2. What they do.
3. Whom they represent, serve or benefit.
4. How they describe their responsibilities and institutional authority.

Do not conduct research into actual board composition, director affiliations, governance arrangements, membership eligibility, voting rights or decision-making authority. Those subjects belong to later research phases.

## 2. Research methodology

Use the student's completed Project 1 as the principal methodological reference.

Reference workbook:

`/mnt/current-semester/RStudio/Fire Discourse SFL Analysis/sfl_coding.xlsx`

Reference methodology:

`/mnt/current-semester/RStudio/Fire Discourse SFL Analysis/methodology.md`

Reference normalization script:

`/mnt/current-semester/RStudio/Fire Discourse SFL Analysis/scripts/normalize_text.py`

Inspect these materials before beginning.

Retain the clause-level approach and the two relevant SFL metafunctions:

- **Ideational:** Processes and grammatical participants.
- **Interpersonal:** Modality.

Add one short representation observation to connect the linguistic coding with the research question.

Do not reproduce the full Project 1 codebook or create additional classification systems.

## 3. Required source corpus

Use exactly these ten webpages.

| ID | Period | Source |
|---|---|---|
| NB-H | 2000 | https://web.archive.org/web/20000419212950id_/http://nbctourism.com/aboutus/index.html |
| NB-C | Contemporary | https://www.travelnbc.com/about-us/ |
| CC-H | 2001 | https://web.archive.org/web/20010309220434id_/http://www.landwithoutlimits.com/about-cta.html |
| CC-C | Contemporary | https://industry.landwithoutlimits.com/about-us/about-cariboo-chilcotin-coast-tourism/ |
| TO-H | 2002 | https://web.archive.org/web/20020808070037id_/http://www.thompsonokanagan.com/aboutus/index.htm |
| TO-C | Contemporary | https://www.totabc.org/about |
| KR-H | 1999 | https://web.archive.org/web/19990203223006id_/http://www.bcrockies.com/html/about_us.html |
| KR-C | Contemporary | https://www.krtourism.ca/company-profile/ |
| VI-H | 2002 | https://web.archive.org/web/20020611055959id_/http://islands.bc.ca/organization/about.htm |
| VI-C | Contemporary | https://www.4vigroup.com/our-work |

### Source acquisition

Inspect the existing local corpus before retrieving documents.

Reuse existing captures only after verifying source identity, archival provenance and content integrity.

For each source:

1. Obtain a complete original webpage.
2. Save a private, immutable copy.
3. Record its source URL and retrieval or archive date.
4. Record publication date only when independently established.
5. Calculate SHA-256.
6. Confirm the page contains an attributable organizational explanation.

Do not substitute other document types without authorization.

If a source is unavailable, record the failure. Do not invent missing source text.

Identify changes in organizational identity or legal continuity where relevant. Do not assume historical and contemporary organizations are legally identical.

## 4. Corpus inclusion rules

Read each complete original before segmentation.

Include substantive institutional explanations concerning:

- Organizational identity and purpose.
- Mission and mandate.
- Actions, responsibilities and commitments.
- Membership and stakeholders.
- Beneficiaries and communities served.
- Claims about organizational representation and institutional authority.

Exclude navigation, advertisements, cookie notices, contact directories, duplicated website components and unrelated promotional descriptions.

For contemporary pages containing extensive project listings, include organizational explanations but exclude unrelated individual project case studies.

**Code all eligible clauses within the defined institutional explanation.**

Do not impose a predetermined number of clauses per document.

Preserve the original source order.

Document the sections included and excluded.

## 5. Clause segmentation

Follow Project 1's clause-level procedure.

Each worksheet row should represent one grammatical clause wherever a defensible separation is possible.

Split independent processes into separate rows.

Preserve a short clause complex when splitting would damage attribution, negation, modality, conditional meaning or the main institutional claim.

Do not treat headings or isolated fragments as independent clauses without justification.

Use scripts to assist segmentation, but examine the clauses against the original document.

For every row, preserve:

- Original clause.
- Normalized clause.
- Source identifier.
- Source location.
- Linguistic coding.
- Any important coding uncertainty.

Do not silently omit eligible clauses.

## 6. Text normalization

Create two distinct text columns.

### `original_clause`

Preserve the source's exact words, punctuation, capitalization, numbers and names.

### `normalized_clause`

Apply the following deterministic procedure:

1. Normalize Unicode to NFKC.
2. Convert to lowercase.
3. Replace punctuation and symbols with spaces.
4. Collapse repeated whitespace.
5. Trim leading and trailing whitespace.

Preserve word order, numbers, diacritics and negation.

Do not stem words, remove stopwords, translate, paraphrase or correct grammatical errors.

Use original wording for SFL classification.

Create one reproducible script:

`scripts/normalize_clauses.py`

## 7. Coding scheme

### 7.1 Ideational process type

Assign one primary classification.

| Code | Meaning |
|---|---|
| `material` | Doing, creating, acting or changing |
| `relational` | Being, having, identifying or describing |
| `verbal` | Saying, reporting or communicating |
| `mental` | Thinking, knowing, wanting or perceiving |
| `existential` | Expressing existence |
| `unclear` | Classification cannot be determined reliably |

Use grammatical context rather than keywords.

### 7.2 Primary participant

Copy the central grammatical participant from the original clause.

Examples:

- `the association`
- `we`
- `our members`
- `local communities`

Use `not stated` if the participant is absent or cannot be identified reliably.

Do not infer actual governing authority from grammatical prominence.

### 7.3 Interpersonal modality

Assign one primary classification:

- `none`
- `possibility`
- `commitment`
- `obligation`
- `unclear`

Consider meaning in context.

Do not automatically classify every occurrence of *will* as a commitment.

### 7.4 Representation note

Write one brief, plain-English observation concerning whom the organization says it represents, serves, includes or benefits.

Preserve important qualifications and numerical estimates.

Distinguish self-reported institutional claims from independently established facts.

If the clause makes no relevant representation claim, enter:

`Not stated in clause`

Do not infer voting rights, board membership or formal authority from promotional statements.

## 8. Excel workbook

Create the canonical workbook in the Git repository root:

`RDMO_about_coding.xlsx`

It must contain exactly eleven worksheets:

1. `Index`
2. `NB_2000`
3. `NB_Current`
4. `CC_2001`
5. `CC_Current`
6. `TO_2002`
7. `TO_Current`
8. `KR_1999`
9. `KR_Current`
10. `VI_2002`
11. `VI_Current`

All ten coding worksheets must use these identical headers, in this order:

| Column | Header |
|---|---|
| A | `clause_id` |
| B | `source_id` |
| C | `source_location` |
| D | `original_clause` |
| E | `normalized_clause` |
| F | `ideational_process_type` |
| G | `ideational_primary_participant` |
| H | `interpersonal_modality` |
| I | `representation_note` |
| J | `coding_note` |
| K | `review_state` |

Every clause must initially have:

`review_state = pending_human_review`

The Index must identify all ten documents and provide source URLs, capture dates, publication dates where established, SHA-256, included and excluded sections, clause counts and material limitations.

### Workbook presentation

- Freeze column headings.
- Enable filters.
- Wrap long text.
- Use readable column widths.
- Preserve complete cell contents.
- Add plain-English explanations to coding-column headers.
- Do not use unnecessary formulas, charts or external links.

The workbook must remain editable and suitable for direct human adjudication in Excel.

Do not create parallel canonical coding CSV files or a new adjudication application.

## 9. Prompt provenance

Use the repository's dedicated directory:

`prompts/`

Before substantive execution, save the exact instructions supplied to Codex:

`prompts/P3-ABOUT-01.md`

Preserve the submitted text verbatim.

Record execution metadata separately from the original instructions, including:

- Date and run identifier.
- Codex model and configuration, where available.
- Starting Git commit.
- Working branch.
- Final workbook path.
- Validation result.

Preserve additional substantive Codex instructions and delegated agent prompts as separately identified records.

Do not reconstruct missing historical prompts and present them as verbatim originals.

The prompt record must be included in the public GitHub repository.

## 10. Archive the previous repository

### Repository inspection

Before any Git changes:

1. Read the current Alfred Git/worktree policy and verify its version.
2. Identify and claim the relevant Alfred Core task.
3. Inspect the canonical checkout, remote state and existing worktrees.
4. Inspect uncommitted changes and worktree ownership.
5. Identify the last published `main` commit preceding this realignment.

A previous local draft worktree may exist. Do not assume ownership of it.

Do not reset, stash or discard existing user changes.

### Create the historical branch

Create a branch named exactly:

`archived`

Anchor it to the verified pre-realignment public `main` commit.

It must preserve the earlier tracked research repository, including the original proposal, methodology, discovery records, source register, scripts and prompts.

If `archived` already exists, verify its contents before proceeding. Never overwrite it.

Publish `archived` to the same GitHub repository only through authorized Git operations.

Verify the published branch points to the intended commit.

Do not rewrite history or force-push.

### Clean the active repository

Prepare the new active research tree in a separate Codex-owned worktree.

Use this structure:

```text
who-speaks-for-a-destination/
├── README.md
├── methodology.md
├── RDMO_about_coding.xlsx
├── corpus/
│   └── sources.csv
├── prompts/
│   └── P3-ABOUT-01.md
└── scripts/
    └── normalize_clauses.py
```

Keep only the files necessary for the current institutional-language study.

Retire superseded tracked files from the active tree through ordinary version-controlled changes after verifying the `archived` branch preserves them.

Do not delete private originals or pre-existing local research work.

### README requirements

The README must explain:

- The current research question.
- The five RDMOs and ten About pages.
- The historical and contemporary comparison.
- Clause segmentation and normalization.
- The coding scheme.
- The public workbook and its provisional review status.
- How readers can locate the original webpages.
- Limitations of the historical comparison.
- The purpose of the `archived` branch.
- The future, separate governance research phase.

The revised methodology must explain why the original three-dataset proposal was replaced with the bounded institutional-language study.

Do not present the change as part of the original October plan.

## 11. Public workbook requirement

**`RDMO_about_coding.xlsx` must be committed and included in the active GitHub repository.**

This requirement is mandatory.

The workbook must be accessible to readers from the repository's normal file listing.

Do not place it only in:

- A local working directory.
- An ignored folder.
- The archived branch.
- An unpublished development branch.
- A private release or external file service.

Label the workbook clearly as **machine-coded, pending human review**.

The public repository must not imply researcher approval of individual classifications.

Before public release, inspect source permissions and copyright implications of reproducing complete third-party webpage clauses. Document the publication basis. If full-text redistribution cannot be justified, preserve the complete workbook locally and report the publication blocker. Do not silently remove clauses, change the workbook schema or publish a materially altered dataset.

Do not publish private credentials, unpublished screening notes, adjudication databases or unrelated files.

## 12. Quality assurance

Complete and report these checks:

| ID | Required verification |
|---|---|
| QA-01 | Ten source identities confirmed |
| QA-02 | Original source captures preserved and hashed |
| QA-03 | Included and excluded source sections documented |
| QA-04 | Each original clause matches its source |
| QA-05 | Clause rows follow source order |
| QA-06 | Normalization reproduces deterministically |
| QA-07 | Coding uses only permitted values |
| QA-08 | All ten coding worksheets use identical headers |
| QA-09 | Every review state is pending human review |
| QA-10 | Completed XLSX reopens successfully |
| QA-11 | Archived branch preserves the former public repository |
| QA-12 | Exact executed prompt is logged |
| QA-13 | Public workbook is present and labelled provisional |
| QA-14 | GitHub publication excludes unauthorized or private material |

Do not report a pass without executed verification.

Any missing source, validation failure or unresolved publication blocker must appear in the final report.

## 13. GitHub delivery

Prepare the verified changes in a task-owned worktree.

Publish the historical `archived` branch and integrate the approved current research changes through the repository's permitted Git procedure.

Do not force-push, overwrite unrelated changes or bypass Alfred Core authorization.

If integration or public release is blocked, preserve the reviewed worktree and commit. Report the blocker and exact next action. Do not claim successful publication.

After publishing, verify the remote branches and confirm GitHub contains:

- The historical `archived` branch.
- The revised README and methodology.
- The ten-source public index.
- The prompt record.
- The normalization script.
- **`RDMO_about_coding.xlsx` on the active branch.**

## 14. Final report

Provide:

1. Archived branch commit SHA and verification.
2. Active branch commit SHA and publication status.
3. Brief before-and-after repository inventory.
4. Exact prompt-log path.
5. Ten source capture results.
6. Clause counts for all ten worksheets.
7. Unclear or disputed coding counts.
8. Workbook integrity results.
9. GitHub link to `RDMO_about_coding.xlsx`, if publication succeeded.
10. Outstanding evidence, copyright or methodological limitations.

**Stop after completing the institutional-language workbook and repository realignment.**

Do not begin board-composition, membership-rights or governance research.

The next stage is human adjudication of the proposed linguistic coding.