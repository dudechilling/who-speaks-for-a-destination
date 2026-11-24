# Who speaks for a destination?

A workbook-backed research atlas for CMNS 3500 at Thompson Rivers University.

**Public website:** https://dudechilling.github.io/who-speaks-for-a-destination/

## The published evidence

**Language — one canonical workbook:** [RDMO_about_coding_review.xlsx](RDMO_about_coding_review.xlsx) contains ten dated About-page sources and 194 machine-proposed clauses, with one source worksheet per capture and an Index. The original clause wording, normalized wording, original AI coding, source locations and review state are preserved. New columns hold source order, paragraph IDs, headings, source-block kind and grouping evidence. The website no longer keeps a second, separate source-structure file.

Human review is recorded separately in human_* fields. Empty review fields are not accepted findings. Only some headings and paragraph boundaries have been checked against original captures; the boundary_basis column distinguishes screenshot-checked, DOM-locator and unverified groups. The website shows selected indexed passages, not necessarily entire historical webpages.

**Governance — distinct evidence template:** [governance.xlsx](governance.xlsx) contains README, Board and Sources worksheets. It is not a duplicate language-coding workbook. The Governance timeline remains disabled where no dated evidence exists.

The [source register](corpus/sources.csv) and [methodology](methodology.md) document source selection, attribution, scope and uncertainty. Timeline dates are source observations, not automatically the original publication dates.

## Adjudication: browser → Excel → GitHub

1. Open **Language → Workbook · GitHub → Open coding review**. The Clause analysis panel switches to an editable Coding review panel; source passages, year and selected clause remain in the same Language page. Proposed AI fields remain separate from human-review decisions.
2. Approve or reject coding locally, then select Export XLSX. The browser generates RDMO_about_coding_review.xlsx with the original proposals and source text intact plus human-review entries. No private review server is contacted.
3. Open the exported workbook in Excel. Inspect every correction and review status against the original source. Browser approval alone is not authenticated source verification.
4. Replace the canonical workbook on GitHub main after manual inspection. GitHub Pages republishes the reviewed file, with changes preserved in Git history.

Browser storage remains local and can be cleared. Export before switching browsers or clearing local data. Local workbook imports change only the visitor's current browser session. The published version changes only through a GitHub commit.

The public mini-site no longer has a private researcher connection or approval API. Prior reviewer-server code remains recoverable from Git history.

## Editing the public site

The Home blurbs are Markdown under [site/content/home/](site/content/home/). Profiles and current RDMO website links are edited under [site/content/profiles/](site/content/profiles/). Edit these on main to republish. Profile blurbs remain explicitly labelled editorial placeholders.

The five independent regional organizations appear on Language and Governance; coding review is accessed from Language’s workbook menu. Vancouver, Coast & Mountains remains hatched on the official geography for context. Language opens in Timeline by default; Tables show source-specific thematic search cues, not human-confirmed findings.

The [AI disclosure](site/content/ai-disclosure.md) is explicitly labelled placeholder material. It must be replaced with an accurate account before final publication.

## Historical scope and source rights

The project compares historical and contemporary institutional self-description across five regional organizations. The earlier broader research plan is preserved on the [archived](https://github.com/dudechilling/who-speaks-for-a-destination/tree/archived) branch.

The public language workbook reproduces third-party excerpts for educational research. The case-specific Canadian fair-dealing rationale and residual legal risks are detailed in [methodology.md](methodology.md#publication-and-fair-dealing-assessment). It is not permission from source publishers or a guarantee against reuse restrictions. Private full-page captures and the larger unpublished local workbook remain outside this deployment.

