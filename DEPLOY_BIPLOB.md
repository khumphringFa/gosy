# Deploy GOSY at biplob.trinamulchtbd.org

GOSY runs **Next.js 16 + Payload CMS 3** and needs persistent **PostgreSQL with PostGIS**. Redis, Typesense, object storage and payment/messaging integrations may be required for full feature support.

## 1. Hosting decision

This is **not a static PHP deployment**. A cPanel document root or Git pull alone is not sufficient. Use a Node.js-capable VPS, managed container host or platform that supports the app's runtime, PostgreSQL/PostGIS and background jobs. Do not modify existing TUS sites.

If keeping DNS at the current cPanel/hosting provider, point only `biplob.trinamulchtbd.org` to the new app server (or use a verified reverse proxy). Keep the other DNS records unchanged.

## 2. Server deployment (example for Linux VPS)

Provision a Linux VPS with Docker Compose, a public IP, HTTPS reverse proxy, and sufficient resources for the Next.js build. Set up Postgres/PostGIS separately or via a persistent Compose service. Use managed backups.

Clone:

```bash
git clone https://github.com/khumphringFa/gosy.git
cd gosy
cp .env.example .env
```

### Configure private environment

Set these in a private environment file, not in Git:

```dotenv
NODE_ENV=production
APP_URL=https://biplob.trinamulchtbd.org
DATABASE_URL=postgresql://USERNAME:PASSWORD@DATABASE_HOST:5432/GOSY_DATABASE
PAYLOAD_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET
REDIS_URL=redis://REDIS_HOST:6379
```

**Important:** `src/payload.config.ts` reads `DATABASE_URL`, but the current `.env.example` advertises `DATABASE_URI`. Use **DATABASE_URL** or application startup will not connect.

Never expose database, Redis, or Typesense to the public internet. Do not publish secrets, credentials or payment keys in the repo.

## 3. Build and start

The checked-in Dockerfile uses Next.js standalone output, but current `next.config.ts` does **not** enable `output: 'standalone'`. Fix this mismatch before using that Dockerfile for production.

Without the Dockerfile, a straightforward Node process is:

```bash
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm build
NODE_ENV=production corepack pnpm start
```

Run behind a process manager (systemd / container restart policy), not an interactive shell. Verify any outstanding database migrations before public launch. For container builds, ensure the app has adequate build RAM and persistence for media where S3 is not enabled.

## 4. DNS and HTTPS

Create/update the **A** record for `biplob` to the app server IP (or a suitable verified CNAME if your platform supplies one). Configure the reverse proxy to forward HTTPS requests for `biplob.trinamulchtbd.org` to the Node service listening privately on port 3000. Issue a TLS certificate (e.g., Let's Encrypt) and redirect HTTP to HTTPS. Do not change the records for `hrm`, `mis`, `www`, `proc` or other TUS sites.

Example **Caddyfile** on a VPS where the Node app listens at 127.0.0.1:3000:

```caddy
biplob.trinamulchtbd.org {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000
}
```

The example applies only when Caddy runs on the same host and has access to the app. Ensure port 80/443 reach Caddy.

## 5. Launch verification

- DNS resolves to the intended host; HTTPS certificate is valid.
- Homepage, navigation and CSS load; Next.js server-side routes work.
- Payload admin login works, and the admin account is secured.
- Postgres connection and schema/migrations have been checked.
- Create a test listing, upload a test image and verify storage persistence.
- Confirm Redis, search, email, background jobs and external integrations that are enabled.
- Perform a test reservation without charging a real customer; verify database writes, callback URL(s), and logs.
- Confirm backups and rollback approach.

## 6. Production risks to resolve

- Current Dockerfile expects standalone Next.js output that isn't enabled.
- App uses `DATABASE_URL`, but the template describes `DATABASE_URI`.
- `docker-compose.yml` is for development: it runs `pnpm dev` and publishes database and Redis ports. Do **not** use it unchanged in production.
- Sensitive payment and email configuration should be enabled only after credentials, callback URLs and provider approval are verified.

## 7. Access needed to complete live deployment

- Whether `biplob` is currently hosted on cPanel, VPS or another platform.
- Whether SSH/Docker/Node runtime and PostgreSQL/PostGIS are available.
- Access to the domain's DNS control panel and the target server.

Live server/DNS configuration cannot be accomplished with repository-only access.
