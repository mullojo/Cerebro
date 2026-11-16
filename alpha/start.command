#!/bin/sh
# Double-click on macOS, or run ./alpha/start.command from Cerebro.
set -eu
cd -- "$(dirname -- "$0")"
exec ./node server.js
