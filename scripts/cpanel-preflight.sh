#!/usr/bin/env bash
# GOSY read-only preflight for CloudLinux/cPanel
# Run from ~/gosy-app. Does not install, modify database, or expose secrets.
set -u
cd /home/trinamul/gosy-app || exit 1
echo "=== GOSY cPanel preflight ==="
printf 'Working directory: '; pwd
printf 'Node: '; node -v 2>&1 || true
printf 'npm: '; npm -v 2>&1 || true
printf 'pnpm: '; if command -v pnpm >/dev/null; then pnpm -v; else echo 'Not installed'; fi
printf 'Git branch: '; git branch --show-current 2>/dev/null || true
printf 'Git HEAD: '; git rev-parse --short HEAD 2>/dev/null || true
for f in app.cjs package.json pnpm-lock.yaml next.config.ts src/payload.config.ts; do
  if test -f "$f"; then echo "FOUND $f"; else echo "MISSING $f"; fi
done
echo '=== Hosting disk and memory (server-wide; account may be limited) ==='
df -h . 2>/dev/null || true
free -h 2>/dev/null || true
echo '=== PostgreSQL client ==='
psql --version 2>&1 || true
echo '=== PostgreSQL host information (safe; no passwords printed) ==='
echo 'Database credentials and PostGIS availability must be tested separately with psql.'
echo '=== Passenger and application log ==='
if test -f stderr.log; then
  echo 'stderr.log is present (review privately before sharing)'
else
  echo 'No stderr.log in app directory'
fi
echo '=== Complete; no changes made ==='
