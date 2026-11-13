# Private workbook adjudicator

This service reads the current authoritative `.xlsx` dynamically and never modifies it. It is designed to run on `127.0.0.1:8778` behind the existing Tailscale Serve route to `https://alfred.tail41f62a.ts.net:8444/`; configuring that route is intentionally out of scope.

Install `pip install -r requirements.txt`, create a private `0600` file containing the one allowed Tailscale login, and run:

```sh
python3 review/server.py --workbook /absolute/RDMO_About_Page_Coding.xlsx --corpus /absolute/corpus/originals --state-dir /secure/local/state --allowed-login-file /secure/local/allowed-login --host 127.0.0.1 --port 8778
```

The SQLite state directory must be outside this repository and SMB shares. Every request is fail-closed on exact forwarded identity and host; POST requests also require exact Origin and CSRF token. Production and `--dev-local` bind only to loopback addresses, and development is visibly labelled in the UI.

CSV exports contain candidate and confirmed fields, source/code states, stale markers, and reviewer metadata. XLSX exports preserve every original worksheet and its styles; only current, source-verified human approvals are overlaid in the downloadable copy, with a separate Review Audit sheet. Pending or stale records remain unchanged.
