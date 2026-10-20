# Public checkpoints

A commit cannot contain its own SHA. Each sweep commit is therefore listed here by the next commit, and the final commit lists all of them. Verify a SHA with:

```bash
git ls-remote https://github.com/dudechilling/who-markets-a-destination refs/heads/main
git log --oneline
```

| Checkpoint | Commit | Pushed to `main` | Verified on GitHub |
|---|---|---|---|
| DISCOVERY-01 publication | `33e38e0e31144b0e8ba4a92d1a8c81bdcca2670f` | 2026-10-20 | yes |
| DISCOVERY-02 sweep 1 (recovery) | `fe52ec06e3b9cbdb8ca2221792ff40aae9391c4f` | 2026-10-20 | yes |
