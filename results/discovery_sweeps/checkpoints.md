# Public checkpoints

A commit cannot contain its own SHA. Each sweep commit is therefore listed here by the next commit, and the final commit lists all of them. Verify a SHA with:

```bash
git ls-remote https://github.com/dudechilling/who-speaks-for-a-destination refs/heads/main
git log --oneline
```

| Checkpoint | Commit | Pushed to `main` | Verified on GitHub |
|---|---|---|---|
| DISCOVERY-01 publication | `fc7ff9917fd4dd06a1d5a8db4ad626045e6da38c` | 2026-10-20 | yes |
| DISCOVERY-02 sweep 1 (recovery) | `64f87d98fb7a47af2740ff93f3b464d127b24d2d` | 2026-10-20 | yes |
| DISCOVERY-02 sweep 2 (historical archive search) | `9a794658905489f431bbaec58e7145a2b96037b1` | 2026-10-20 | yes |
| DISCOVERY-02 sweep 3 (coverage assessment) | `dd03fde6e54231553e8406a088887b201f5218a5` | 2026-10-20 | yes |
| DISCOVERY-02 sweep 4 (final reconciliation) | `b04451835c6704291b44b14855aeb07b8f9e4776` | 2026-10-20 | yes |

## History correction

On October 20, 2026, the repository history was corrected to remove personal contact information. Research records, source provenance and discovery results were preserved.

How the public research history was preserved:
- Only one line of one historical file changed. All other file contents in every commit are unchanged, and commit authors and dates are kept.
- The commit SHAs in the table above and in the sweep reports are the current, valid ones. Each is reachable from `main`.
- A full-tree privacy check (`scripts/prepublish_check.py --all`) passes on the current branch.
- `scripts/validate_inventory.py` confirms the research inventory, checksums and provenance after the correction.
