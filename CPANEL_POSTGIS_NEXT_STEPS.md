# GOSY cPanel safe preparation — PostGIS pending

Status as of 2026-10-30: cPanel Node 22.23.4 running as registered application at biplob.trinamulchtbd.org. Code at /home/trinamul/gosy-app. PostgreSQL 13.23 connection established with database trinamul_gosy, user trinamul_mel. `pg_available_extensions` returns 0 rows for PostGIS. Hold migrations and launch.

## Read-only server checks
```bash
source /home/trinamul/nodevenv/gosy-app/22/bin/activate
cd /home/trinamul/gosy-app
git status --short
bash scripts/cpanel-preflight.sh
```
No database password is requested and no data changes are made.

## Keep app from trying to launch prematurely
Use **Stop App** in cPanel until database extension, runtime env and production build are ready; leave registration intact. Do not publish test payment URLs or live bookings.

## Check database, without changes
```bash
psql -h 127.0.0.1 -p 5432 -U trinamul_mel -d trinamul_gosy
```
In the SQL prompt:
```sql
SELECT current_database(), current_user(), version();
SELECT name, default_version, installed_version FROM pg_available_extensions WHERE name = 'postgis';
```
Exit with `\\q`. Preserve existing database data. Database user `trinamul_mel` is currently shared-looking; prefer dedicated GOSY credentials before production, and never expose passwords/screenshots.

## Hosting provider request
Ask for PostGIS for PostgreSQL 13 or supported alternate version, cPanel account memory and process limits, Passenger startup compatibility, background job support, and managed Redis/Typesense/S3 network access. Do not request a PostgreSQL upgrade affecting other users without compatibility and backups.

## After PostGIS is confirmed
1. Backup database; use a separate dedicated DB/user or audited migrations.
2. Confirm environment keys, `DATABASE_URL` (rather than historical `DATABASE_URI`) and random PAYLOAD_SECRET; save private env with restricted permissions.
3. Verify packages and runtime resource limits, install dependencies using lockfile and pnpm.
4. Execute production build, inspect errors. Only then apply reviewed migrations.
5. Restart CloudLinux app through cPanel and inspect logs.
6. Verify homepage, admin, listings, media uploads, booking with payments disabled, Redis, search, email and backups.
