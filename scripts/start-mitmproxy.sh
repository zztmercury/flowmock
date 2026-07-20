#!/usr/bin/env bash
set -euo pipefail

# start-mitmproxy.sh — start the legacy mitmproxy-based pbmockx
# (kept as fallback for environments without Node.js/whistle)
#
# Usage: ./scripts/start-mitmproxy.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PROXY_PORT="${PBMOCKX_PROXY_PORT:-8080}"
WEB_PORT="${PBMOCKX_WEB_PORT:-8081}"
CONTROL_PORT="${PBMOCKX_PORT:-9090}"

VENV_PYTHON="$PROJECT_ROOT/.venv/bin/python"
if [ ! -f "$VENV_PYTHON" ]; then
    echo "[!] venv not found. Run: ./scripts/install.sh (legacy mode)"
    exit 1
fi

exec "$VENV_PYTHON" -m mitmweb \
    -s "$PROJECT_ROOT/addon/pbmockx_addon.py" \
    --mode "regular@127.0.0.1:$PROXY_PORT" \
    --set "pbmockx_control_port=$CONTROL_PORT" \
    --set "web_password=pbmockx" \
    --set "web_port=$WEB_PORT" \
    --no-web-open-browser
