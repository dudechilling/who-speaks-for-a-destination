<!--
Prompt record
Task identifier: CMNS3500-P3-REPOSITORY-CLEANUP-02
Execution timestamp: 2026-10-20 21:45:12 UTC (+0000)
Relayed by: user (Earl), in a Claude Code session
Content below this comment: the relayed prompt, unchanged.
-->

TASK: CMNS3500-P3-REPOSITORY-CLEANUP-02
Objective: Complete the Git history privacy correction and update the project's public identity.
Repository:
`https://github.com/dudechilling/who-speaks-for-a-destination`
Project directory:
`/mnt/current-semester/Fall 2026/CMNS 3500/Assignments/Project 3 - Final Project/Working Files`
1. RECORD THE PROMPT
Save this prompt verbatim in `Working Files/prompts/`.
Use a timestamped filename.
Do this before executing the remaining steps.
Do not publish any prompt containing personal contact information or sensitive historical commit references.
2. VERIFY THE REPOSITORY
Inspect the current Git state.
Confirm:

* The working tree is clean.
* Local `main` matches remote `main`.
* The repository uses the renamed GitHub address.
* The latest commit contains the public history-rewrite mapping.
* No other worker is editing this checkout.

Do not alter another worker's checkout.
If the branch has changed or contains uncommitted work, stop and report the difference.
Follow the active Alfred Git and worktree policy.
3. PRESERVE THE PRIVATE HISTORY RECORD
Copy the complete old-to-new commit SHA mapping into a private file under:
`.discovery_state/privacy/`
Include:

* The original commit SHAs.
* Their replacement SHAs.
* The SHA of the commit that published the mapping.
* The reason for the history correction.
* The method used.
* Verification results.

Set restrictive file permissions.
Confirm this file is excluded from Git.
Do not delete the existing research history or archival records.
4. REMOVE THE PUBLIC SHA MAPPING
Edit:
`results/discovery_sweeps/checkpoints.md`
Remove:

* The old-to-new SHA mapping table.
* References that identify the old, privacy-affected commits.
* Direct links to historical objects that expose the removed information.

Preserve:

* The valid rewritten checkpoint SHAs.
* Sweep names and publication dates.
* Verification information.
* The explanation of how the public research history was preserved.

Use a brief public note:
"On October 20, 2026, the repository history was corrected to remove personal contact information. Research records, source provenance and discovery results were preserved."
Do not include the removed contact information or historical commit identifiers in that note.
Inspect other tracked files for references to the old SHAs.
Remove unnecessary public references without altering historical source records.
5. UPDATE THE PROJECT TITLE
The approved project title is:
Who speaks for a destination?
Update:

* The README heading.
* The GitHub repository description.
* Current project documentation that still uses the previous project title.
* Active repository URLs and navigation links.

Use this repository description:
"A historical study of language, governance and performance in British Columbia's regional tourism organizations."
Do not rewrite original documents, historical prompt records or archival evidence merely because they contain the earlier project title.
Do not change the research questions or methodology.
6. AMEND THE PUBLIC COMMIT
The SHA mapping was introduced in the latest commit.
Verify that this is still true.
Amend that commit to remove the public mapping and include the approved title corrections.
Preserve its other legitimate changes, including the improved privacy scanner.
Do not rewrite earlier clean discovery commits.
Before pushing:

* Inspect the complete amended diff.
* Verify all expected files remain.
* Check that no research data was deleted.
* Verify that no sensitive contact information was introduced.
* Confirm the new commit contains no old-to-new SHA mapping.

Push using `--force-with-lease` pinned to the exact remote HEAD verified before the amendment.
Do not use an unrestricted force-push.
If the remote branch has moved, stop.
7. VERIFY THE PUBLIC REPOSITORY
After pushing:

1. Fetch the remote branch.
2. Verify the new commit SHA.
3. Confirm the local and remote branches match.
4. Run the full-tree privacy scanner.
5. Inspect the reachable Git history.
6. Confirm the removed personal number is absent from every commit reachable from `main`.
7. Confirm the public SHA mapping is absent.
8. Confirm the approved organizational contact exception remains unchanged.
9. Verify the README and repository description.
10. Run the existing research inventory validation.

Confirm that the inventory still contains:

* 1,972 candidate records.
* 1,730 complete downloaded originals on the m710.
* All existing provenance records.
* No researcher-approved corpus entries.

These are expected baseline figures. Report any legitimate differences rather than changing records to match them.
8. PREPARE A GITHUB SUPPORT REQUEST
GitHub may continue serving unreferenced historical commits by their exact SHAs.
Check whether the affected historical objects remain publicly accessible.
Prepare a private support request asking GitHub to remove cached views and references to the sensitive historical objects.
Include the exact affected URLs in the private request.
Do not put those URLs in public documentation.
Save the request under:
`.discovery_state/privacy/`
Do not submit the request without Earl's authorization.
Do not claim that the personal information has been fully removed from GitHub until the remaining accessible objects have been addressed.
9. FINAL REPORT
Return:

* New GitHub HEAD SHA.
* Files changed.
* Files preserved.
* Privacy scan results.
* Research inventory validation results.
* Confirmation that the public mapping was removed.
* Whether the old commits remain accessible.
* Location of the private GitHub Support request.
* Any remaining actions requiring Earl's approval.

Do not repeat the personal phone number in the final report.
ACCEPTANCE CRITERIA
The public repository uses the title Who speaks for a destination?
The old-to-new SHA mapping is no longer present in Git history reachable from `main`.
The full mapping remains available privately on the m710.
The personal contact information is absent from the current branch and its reachable history.
The research inventory, provenance records and discovery results remain intact.
The GitHub Support request is prepared but not submitted.
Stop after repository cleanup. Do not begin corpus selection, coding, analysis or website development.
