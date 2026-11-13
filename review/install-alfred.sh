#!/usr/bin/env bash
# Run explicitly as Earl on Alfred; installs private reviewer without changing existing Serve handlers.
set -euo pipefail
APP="/home/earl/.local/share/rdmo-about-review"
WB="/mnt/current-semester/Fall 2026/CMNS 3500/Assignments/Project 3 - Final Project/Working Files/docs/RDMO_About_Page_Coding.xlsx"
CORPUS="/mnt/current-semester/Fall 2026/CMNS 3500/Assignments/Project 3 - Final Project/Working Files/corpus/originals"
ALLOW="/mnt/current-semester/Fall 2026/CMNS 3500/Assignments/Project 3 - Final Project/rapid adjudication/bounded feasibility test/human adjudicator/state/tailnet-login.txt"
STATE="/home/earl/.local/state/rdmo-about-review"
UNIT="$HOME/.config/systemd/user/rdmo-about-review.service"
[[ "$(id -un)" = earl ]] || { echo "Run as Earl" >&2; exit 1; }
for f in "$APP/server.py" "$APP/venv/bin/python" "$WB" "$CORPUS/source_index.csv" "$ALLOW"; do [[ -f "$f" ]] || { echo "Missing: $f" >&2; exit 1; }; done
[[ "$(stat -c %a "$ALLOW")" = 600 ]] || { echo "Allowlist must have mode 600" >&2; exit 1; }
mkdir -p "$HOME/.config/systemd/user" "$STATE"
chmod 700 "$STATE"
cat > "$UNIT" <<EOF
[Unit]
Description=RDMO About-page private adjudicator
After=network-online.target

[Service]
Type=simple
WorkingDirectory=$APP
ExecStart=$APP/venv/bin/python -B $APP/server.py --workbook "$WB" --corpus "$CORPUS" --state-dir $STATE --allowed-login-file "$ALLOW" --host 127.0.0.1 --port 8778
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=$STATE

[Install]
WantedBy=default.target
EOF
chmod 600 "$UNIT"
systemctl --user daemon-reload
systemctl --user enable --now rdmo-about-review.service
systemctl --user is-active rdmo-about-review.service
tailscale serve --bg --https=8444 http://127.0.0.1:8778
tailscale serve status
echo "Reviewer URL: https://alfred.tail41f62a.ts.net:8444/"
