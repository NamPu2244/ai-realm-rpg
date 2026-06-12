#!/bin/bash
# Build the app, start it, and expose it via ngrok with one command.
set -e

NGROK_DOMAIN="bucket-lung-shale.ngrok-free.dev"
PORT=3000

cleanup() {
  echo "Stopping..."
  kill "$NEXT_PID" "$NGROK_PID" 2>/dev/null
}
trap cleanup EXIT INT TERM

npm run build

npm run start -- -p "$PORT" &
NEXT_PID=$!

ngrok http --url="$NGROK_DOMAIN" "$PORT" &
NGROK_PID=$!

wait "$NEXT_PID" "$NGROK_PID"
