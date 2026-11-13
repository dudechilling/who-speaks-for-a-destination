#!/usr/bin/env bash
# Manual upgrade for the private RDMO reviewer; no changes to Serve or the canonical workbook.
set -euo pipefail
umask 077
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
APP="/home/earl/.local/share/rdmo-about-review"
STATE="/home/earl/.local/state/rdmo-about-review"
SERVICE="rdmo-about-review.service"
WORKBOOK="/mnt/current-semester/Fall 2026/CMNS 3500/Assignments/Project 3 - Final Project/Working Files/docs/RDMO_About_Page_Coding.xlsx"
BACKUP_DIR="$STATE/upgrade-backups"
[[ "$(id -un)" == "earl" ]] || { echo "Run only as earl on Alfred." >&2; exit 1; }
for p in "$SOURCE_DIR/server.py" "$SOURCE_DIR/tests/test_server.py" "$APP/venv/bin/python" "$APP/server.py" "$WORKBOOK"; do
  [[ -f "$p" ]] || { echo "Missing required file: $p" >&2; exit 1; }
done
export XDG_RUNTIME_DIR=/run/user/1000
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus
BEFORE="$(sha256sum "$WORKBOOK" | cut -d' ' -f1)"
"$APP/venv/bin/python" -B -m unittest discover -s "$SOURCE_DIR/tests" -v
"$APP/venv/bin/python" -B -c 'import sys; compile(open(sys.argv[1],encoding="utf8").read(),sys.argv[1],"exec")' "$SOURCE_DIR/server.py"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="$BACKUP_DIR/server-$STAMP.py"
cp -p "$APP/server.py" "$BACKUP"
chmod 600 "$BACKUP"
restore() {
  echo "Upgrade failed; restoring previous server." >&2
  cp "$BACKUP" "$APP/server.py"
  systemctl --user restart "$SERVICE" || true
}
trap restore ERR
install -m 0644 "$SOURCE_DIR/server.py" "$APP/server.py"
systemctl --user restart "$SERVICE"
systemctl --user is-active --quiet "$SERVICE"
sleep 1
STATUS="$(curl -sS -o /dev/null -w '%{http_code}' -m 5 -H 'Host: alfred.tail41f62a.ts.net:8444' 'http://127.0.0.1:8778/api/bootstrap')"
[[ "$STATUS" == "403" ]] || { echo "Unauthorized request returned $STATUS, expected 403" >&2; exit 1; }
AFTER="$(sha256sum "$WORKBOOK" | cut -d' ' -f1)"
[[ "$AFTER" == "$BEFORE" ]] || { echo "Canonical workbook checksum changed; stopping." >&2; exit 1; }
trap - ERR
printf 'Reviewer backend updated; service active; unauthorized requests denied; workbook unchanged.\n'
printf 'Private URL: https://alfred.tail41f62a.ts.net:8444/\n'