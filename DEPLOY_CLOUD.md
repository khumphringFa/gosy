# GoSy — managed cloud deployment (no purchased domain)

GoSy remains a Next.js/Payload application with PostgreSQL/PostGIS and Sharp image processing. Do not deploy it as a static site or replace PostgreSQL with D1: this would remove required booking and geographic functionality. Use Cloud Run as the Node runtime, Cloudflare Workers for the public URL, R2 for private media, and Google OAuth for guest login. Google Drive stores encrypted database backups, not live booking data.

## 1. Prerequisites and cost controls

- A Google Cloud project with billing authorized by the owner, Cloud Run, Cloud Build, Artifact Registry, Secret Manager, and optionally Cloud Scheduler enabled. Cloud Run has usage allowances, but builds, registry, scheduler, network, and database may cost money. Set a budget alert and maximum instances; budget alerts are not hard spending caps.
- An existing PostgreSQL database supporting PostGIS, with TLS and an appropriate database credential. Cloud SQL is paid outside trials; a separate free-tier provider is possible if it supports PostGIS. Create an empty staging database initially. Do not point the first deployment at a production database or import demo data into it.
- A Cloudflare account with Workers and a private R2 bucket. Create a scoped R2 API token with read/write for only that bucket. Do not make the bucket public.
- For shared OTP/rate limiting, supply a TLS Redis URL; in-memory fallback is not reliable across instances/restarts. Optional Typesense enables dedicated search; verify search behavior without it.

## 2. Build the Node image

From the repository root, with the Google CLI logged in:

```sh
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
gcloud artifacts repositories create gosy --repository-format=docker --location=asia-southeast1
IMAGE=asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/gosy/web:YOUR_COMMIT_SHA
gcloud builds submit --config=cloudbuild.yaml --substitutions=_IMAGE="$IMAGE" .
```

The Dockerfile builds without real production DB credentials. Deploy only after validation. Create a dedicated Cloud Run service account and grant Secret Manager access only to GoSy's secrets. In Secret Manager create individual secrets for DATABASE_URL, PAYLOAD_SECRET (random, persistent), S3_ACCESS_KEY, S3_SECRET_KEY, GOOGLE_CLIENT_SECRET, REDIS_URL, JOBS_SECRET. Never commit these values. Preserve the Payload secret across deployments. Configure runtime variables with the intended public URL, S3 bucket name and endpoint, S3_REGION=auto, Google client ID. For example `https://ACCOUNT_ID.r2.cloudflarestorage.com` as S3_ENDPOINT. Use explicit secret versions for controlled rollout.

Before serving requests, create PostGIS (`CREATE EXTENSION IF NOT EXISTS postgis` using a permitted database administrator) and run `pnpm payload migrate` against the staging database from an authorized one-off environment with the same settings. You may use a Cloud Run Job running the image (`pnpm`, arguments `payload,migrate`); do not repeatedly run migrations on every web instance. Existing DBs must have their actual migration history reconciled and backed up first; don't run the initial migration blindly against an existing schema.

Deploy the immutable image to Cloud Run using the console (or gcloud). Choose port 8080, request-based billing, 1 CPU / 2 GiB to start, minimum 0, maximum 1 during pilot; tune after load testing. Select the GoSy service account, map runtime secrets and variables, and allow unauthenticated web access only after initial admin bootstrap. Cloud Run has a `run.app` URL, so it does not require a purchased domain. Check the service logs and `/` before proceeding. Bootstrap the first admin privately (e.g. using the repository's `scripts/create-super-admin.ts` with staging credentials), then enable public access. No default admin credentials.

## 3. Cloudflare public URL

In Workers & Pages connect GitHub `khumphringFa/gosy`, choose the approved branch and `cloudflare` as the root directory (deployment command `npx wrangler deploy`), or run `npx wrangler deploy --config cloudflare/wrangler.toml` from your authenticated workstation. Set Worker variable `ORIGIN_URL` to the exact Cloud Run HTTPS service origin. Deploy, note the generated `workers.dev` URL and set Cloud Run's `APP_URL` to that URL, with no trailing slash or path. The Worker forwards methods, cookies and redirects without caching private requests. The Cloud Run origin remains public; Payload must enforce authorization independently. Never treat the proxy as the only access-control barrier.

R2: keep the existing signed-download and Payload access rules. Test public listing photos and restricted payment proof/invoice downloads with two different guests. Use an independent media bucket backup/replication strategy; the database backup contains metadata, not the actual image objects.

## 4. Google sign-in

In Google Cloud Console → Google Auth Platform, configure branding, audience, and a Web application OAuth client. Register the final public HTTPS URL as the authorized JavaScript origin and its exact `/api/google/callback` as an authorized redirect URI. During testing, add approved test users. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the Cloud Run runtime. Google login creates only guest accounts and signs returning guests in by Google subject; email collisions with pre-existing accounts are rejected rather than silently linked. Admin and partner passwords continue to work. Test with a new guest, returning guest, unapproved test user, existing email, logout, and cancellation before public rollout. Publishing and verification requirements depend on Google's applicable policy and domain configuration.

## 5. Jobs and backup

Set JOBS_SECRET to a long random secret and configure Cloud Scheduler to POST every minute to the Cloud Run service `/api/cloud/jobs` with `Authorization: Bearer <secret>` over HTTPS. The internal Payload cron is disabled when this secret is set. Keep pilot at one instance and avoid overlapping invocations. Otherwise request-based Cloud Run may suspend the internal timer between requests. Verify overdue booking cancellation, invoices and email tasks in staging.

The backup scripts require PostgreSQL client tools of matching version, GnuPG, and rclone. Configure a private Google Drive rclone remote under your account using its OAuth consent flow. Use a dedicated backup identity when possible. Supply DATABASE_URL, BACKUP_PASSPHRASE and DRIVE_REMOTE from a secure store. `bash scripts/cloud-backup.sh` makes a custom-format dump, checks its archive, encrypts with AES256 and uploads to Drive. Run via a private scheduled job or trusted machine daily; never expose the passphrase or rclone OAuth config in Git. Restrict Drive sharing, preserve the encryption passphrase separately, and configure retention according to your policies. For recovery set RESTORE_DATABASE_URL to a NEW empty database, BACKUP_NAME to the selected archive and execute `bash scripts/cloud-restore.sh`; it refuses a target with application tables. Restore R2 media separately and test recovery before switching production. Backups include payment metadata and personal information; never share publicly.

## 6. Go-live gate

- Production build, migration, and backup recovery pass on staging.
- First admin account is created before public traffic; guest, partner and admin roles are isolated.
- Test HTTPS, logout, Google login, media permissions and mobile booking.
- Configure shared Redis, payment gateway sandbox callbacks, email/SMS providers and job scheduling. Real payments remain disabled until merchant authorization and sandbox testing pass.
- Verify live booking concurrency, room availability, successful payment and cancellation, then review monitoring and budget settings.

No cloud services, secrets, or OAuth clients are created by committing this repository. Deployment requires the owner's account authorization and database choice.
