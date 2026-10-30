# GOSY on biplob.trinamulchtbd.org — cPanel decision checklist

## First: verify platform support

The repository is a **Next.js 16 / Payload CMS 3** server application, **not** a static PHP website. It requires a running Node server and PostgreSQL with the **PostGIS** extension. Full features also use Redis, Typesense, object storage, and third-party integrations.

In the existing cPanel account, check:
- **Software → Setup Node.js App** (CloudLinux), **Application Manager**, or newer **Web Apps** and Node.js 22 or newer compatible runtime.
- **Advanced → Terminal** or SSH.
- **Databases → PostgreSQL Databases**, and ask the host if **PostGIS** can be enabled for this database. Basic PostgreSQL support alone is not sufficient.
- Sufficient RAM/build process limits for Next.js and Payload CMS; a shared cPanel plan may not provide this.
- Background process support for scheduled Payload jobs; Redis and Typesense availability or permission to use managed external services.
- Existing **Domains** entry and SSL for `biplob.trinamulchtbd.org`.

Do not replace other domains' DNS records or move any existing PHP app files.

## Option A: direct cPanel deployment (only when all requirements are supported)

1. Use a private app root outside public web folders, e.g. `/home/CPANELUSER/gosy-app`.
2. Clone `https://github.com/khumphringFa/gosy.git` into that location.
3. Add a private `.env` with at minimum:
   ```dotenv
   NODE_ENV=production
   APP_URL=https://biplob.trinamulchtbd.org
   DATABASE_URL=postgresql://DBUSER:DBPASSWORD@DBHOST:5432/DBNAME
   PAYLOAD_SECRET=GENERATE_A_LONG_RANDOM_VALUE
   REDIS_URL=redis://REDIS_HOST:6379
   ```
4. Supply any required Typesense, S3, email or payment integration secrets separately.
5. From the app root, after verifying compatible Node/pnpm:
   ```bash
   corepack enable
   pnpm install --frozen-lockfile
   pnpm build
   ```
6. Register `biplob.trinamulchtbd.org` as a Node.js application in the available cPanel interface. The startup configuration is **host-specific**: do not assume Next.js `next start` or the checked-in Dockerfile can be run unchanged under Passenger. Confirm the cPanel runtime process startup/port-binding model with the provider.
7. Configure the runtime to use the production environment, database, valid TLS, and a process lifecycle that survives restarts. Apply and verify any required migrations.
8. Test website routes, Payload admin, database writes, image uploads, booking flows, and rollback/backup before making the app public.

### Repository issues

- `src/payload.config.ts` reads `DATABASE_URL`; `.env.example` presently says `DATABASE_URI`. Set `DATABASE_URL`.
- Current Dockerfile expects Next.js `output: 'standalone'`; `next.config.ts` does not set it. Either enable standalone output (after testing) or choose another production run strategy.
- `docker-compose.yml` is development-only (`pnpm dev`) and exposes Postgres/Redis host ports; do not run unchanged on a public server.

## Option B: external Node-compatible host (recommended if cPanel lacks PostGIS, RAM or background services)

1. Deploy GOSY on a VPS/container host with Next.js, PostgreSQL/PostGIS and required supporting services.
2. Keep `trinamulchtbd.org` and all other existing subdomains on current cPanel.
3. Change **only** the `biplob` DNS record to the external app address, or configure a supported reverse proxy.
4. Add `biplob.trinamulchtbd.org` as a verified custom domain on the app host and issue its HTTPS certificate.
5. Verify SSL, booking flow, database writes, admin permissions, backups and uptime.

## Hosting provider verification request

> Please confirm whether my current shared cPanel plan supports production Node.js 22+ (Next.js 16 + Payload CMS 3), SSH/build commands, PostgreSQL with the PostGIS extension, persistent background processes/jobs, Redis/Typesense (local or external), and enough memory for the build. I want to run the app only at biplob.trinamulchtbd.org without changing any other subdomain or PHP site.
