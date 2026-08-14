# Hadoukraft API

The API uses PostgreSQL for users, sessions, combos, likes, and rate limits. Images and videos use Vercel Blob; combo video metadata is stored in PostgreSQL as JSONB.

## Configuration

1. Create a PostgreSQL database named `hadoukraft`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Run `npm run dev`. Tables and indexes are created automatically.

Check the connection at `http://localhost:3100/api/health`. Browser authentication uses an HttpOnly session cookie.

## Vercel deployment

1. Create a public Vercel Blob store connected to the project.
2. Add `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `SESSION_TTL_DAYS`, `DATABASE_POOL_MAX=3`, `TRUST_PROXY=true`, and a long random `CRON_SECRET` in the Vercel project settings.
3. Import this directory as the Vercel project root. `vercel.json` builds the Vite client and routes `/api/*` to the catch-all Node.js function.

Use a hosted PostgreSQL connection string for `DATABASE_URL`; a localhost URL will not work after deployment. Vercel automatically supplies `PORT`, so it does not need to be configured there.

Run `npm run migrate` against the production database before the first deployment and whenever a new numbered file is added under `migrations/`. Set `DATABASE_SSL=true` only when your provider uses a certificate chain trusted by Node.js; otherwise use the provider's documented connection-string TLS parameters. Prefer the provider's pooled/serverless connection URL.

## Operations

- Enable point-in-time recovery or daily backups with the PostgreSQL provider and test a restore before launch.
- Enable Vercel Observability and function logs. Connect an error-reporting service through its Vercel integration if alerting and stack-trace retention are required.
- Vercel calls `/api/maintenance` daily to remove expired sessions and rate-limit records. The platform authenticates that cron request with `CRON_SECRET`.
- After deployment run `DEPLOYMENT_URL=https://your-domain npm run healthcheck`. Configure the same `/api/health` URL in an uptime monitor.
- Integration tests require an isolated PostgreSQL database in `TEST_DATABASE_URL`. `npm test` skips them when that variable is absent; CI supplies a disposable PostgreSQL service automatically.
- Replace `https://hadoukraft.vercel.app` in `client/index.html`, `robots.txt`, and `sitemap.xml` if the production domain differs.
