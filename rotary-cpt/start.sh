#!/bin/bash
cd "$(dirname "$0")"
PORT=8080
URL="http://localhost:$PORT"

# Open browser after a short delay (give server time to start)
(sleep 2; (command -v open >/dev/null 2>&1 && open "$URL") || (command -v xdg-open >/dev/null 2>&1 && xdg-open "$URL")) &

echo "Starting Rotary-CPT server..."
echo ""
echo "  Open in your browser: $URL"
echo ""
echo "  Press Ctrl+C to stop the server."
echo ""

python3 -m http.server $PORT 2>/dev/null || python -m http.server $PORT
