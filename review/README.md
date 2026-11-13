# Unified RDMO adjudicator

The public interface is the **Adjudicator** route on the full-screen GitHub Pages site at https://dudechilling.github.io/who-speaks-for-a-destination/#adjudicator.

**Visitor mode:** works within the browser with the immutable, published, rights-cleared `site/data/approved.json` reference (initially empty). Visitors may edit their own versions, approve or reject personal classifications, and import/export JSON or CSV. These decisions never change the public reference, the workbook, or another visitor's work.

**Researcher mode:** select **Connect researcher mode** while connected to Alfred's tailnet. The public browser connects directly to the authenticated, private API at `https://alfred.tail41f62a.ts.net:8444/`. Chrome may ask permission to connect to a local network. The API reads the **current local** `RDMO_About_Page_Coding.xlsx` dynamically, including all ten About pages and pre-coded rows, and records review decisions in a separate append-only SQLite database. The canonical workbook remains unmodified.

**Approve** attests to source verification and accepts the displayed code proposals or edited replacements. Correcting source text requires explicit renewed coding confirmation. **Reject** rejects the classification, not the source's authenticity. Original model proposals remain recoverable. After a confirmed API save, researcher mode shows updated decisions; stale workbook fingerprints invalidate approvals. **Export all XLSX** downloads a reviewed copy containing the original sheets and an audit sheet, without overwriting the canonical workbook.

**Deployment:** `review/server.py` is a local Python application bound to 127.0.0.1:8778 behind Tailscale Serve port 8444. It is not included in the public Pages artifact. The local state directory and reviewer allowlist are outside Git. Run the checked `review/update-alfred.sh` manually on Alfred after code release; the script tests, backs up and upgrades only the backend service. The existing port 8443 adjudicator and Tailscale Serve configuration are not reset.

**Publishing approved material:** researcher review alone does not publish text to GitHub. Only after explicit rights/provenance review should an owner prepare and publish an approved-only snapshot to `site/data/approved.json`. The backend's private `/api/export-approved.json` endpoint generates an **unpublished** release candidate. The current public dataset remains empty until this release gate is satisfied.

**Verification:** run `python -m pip install -r review/requirements.txt`, `python -m unittest discover -s review/tests -v`, `node --check site/app.js`, and `node --test site/tests/app.test.mjs`. The tests use synthetic source passages and do not write into the current workbook.