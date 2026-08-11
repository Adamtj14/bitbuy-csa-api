#!/usr/bin/env bash
# One-command macOS scheduler setup.
#
#   Install:    bash scheduling/install-macos.sh
#   Uninstall:  bash scheduling/install-macos.sh --uninstall
#
# Generates a launchd job (with the correct absolute paths for THIS machine)
# that runs `book` at 08:05 every weekday. launchd also runs a job it missed
# while the laptop was asleep, so a closed lid at 08:05 self-corrects on wake.
set -euo pipefail

LABEL="com.spaceiq.booker"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

# Resolve the spaceiq-booker project dir (this script lives in scheduling/).
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "${1:-}" == "--uninstall" ]]; then
  launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Removed the scheduled job. It will no longer run automatically."
  exit 0
fi

NODE_BIN="$(command -v node || true)"
if [[ -z "$NODE_BIN" ]]; then
  echo "Could not find node. Install Node.js first (https://nodejs.org), then re-run." >&2
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$PROJECT_DIR/src/index.js</string>
    <string>book</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$PROJECT_DIR</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>SPACEIQ_HEADED</key>
    <string>0</string>
  </dict>
  <key>StartCalendarInterval</key>
  <array>
    <dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>8</integer><key>Minute</key><integer>5</integer></dict>
    <dict><key>Weekday</key><integer>2</integer><key>Hour</key><integer>8</integer><key>Minute</key><integer>5</integer></dict>
    <dict><key>Weekday</key><integer>3</integer><key>Hour</key><integer>8</integer><key>Minute</key><integer>5</integer></dict>
    <dict><key>Weekday</key><integer>4</integer><key>Hour</key><integer>8</integer><key>Minute</key><integer>5</integer></dict>
    <dict><key>Weekday</key><integer>5</integer><key>Hour</key><integer>8</integer><key>Minute</key><integer>5</integer></dict>
  </array>
  <key>StandardOutPath</key>
  <string>$PROJECT_DIR/booker.log</string>
  <key>StandardErrorPath</key>
  <string>$PROJECT_DIR/booker.log</string>
</dict>
</plist>
PLIST_EOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo "Scheduled: 'book' will run at 08:05 every weekday."
echo "  Node:    $NODE_BIN"
echo "  Project: $PROJECT_DIR"
echo "  Log:     $PROJECT_DIR/booker.log"
echo
echo "Test it right now with:   node $PROJECT_DIR/src/index.js book"
echo "Uninstall later with:     bash scheduling/install-macos.sh --uninstall"
