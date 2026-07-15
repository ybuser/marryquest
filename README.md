# MarryQuest – Next.js Baseline

Recovery baseline for the MarryQuest invitation experience using the **Next.js Pages Router**, TypeScript, Tailwind CSS, and shadcn/ui-inspired primitives. Production database, storage migration, deployment, and domain gates are still outstanding.

## Requirements
- Node 20 LTS (see `.nvmrc`)
- npm (package-lock is committed; prefer `npm ci`)

## Getting started
```bash
npm ci
npm run dev
```

Visit `http://localhost:3000`.

## Scripts
- `npm run dev` – start the development server
- `npm run build` – generate Prisma client and create a production build
- `npm run start` – serve the production build
- `npm run lint` – lint with `next lint`
- `npm run db:migrate` – apply database migrations (one-off)
- `npm run auth:hash` – read an owner password from stdin and emit one versioned scrypt hash
- `npm run secret:generate` – emit one random application secret

## Project structure
- `/pages` – pages router entries (`index.tsx`, `api/health.ts`)
- `/components/ui` – shadcn-inspired UI primitives
- `/components/theme` – theme tokens and provider for template-driven layouts
- `/lib/security` – security headers and rate-limiter helper
- `/lib/validate.ts` – centralized Zod validation helpers
- `/styles` – Tailwind and global styles

## Security headers
All routes share hardened headers via `next.config.js`:
- Content Security Policy (with `frame-ancestors 'none'`)
- HSTS (`max-age=63072000; includeSubDomains; preload`)
- Referrer-Policy (`no-referrer`)
- X-Content-Type-Options (`nosniff`)
- Permissions-Policy (camera, microphone, geolocation denied)

## Theme tokens
Templates are defined in `/components/theme/tokens.ts`:
- **Mono Minimal** – monospaced rhythm
- **Editorial Magazine** – serif, airy spacing
- **Film Strip** – cinematic gallery focus

`ThemeProvider` selects a template by `templateKey` (e.g., query string or page props) and injects CSS variables for typography, spacing, and gallery behavior.

## Validation & rate limiting
- Use `validate`/`assertValid` from `/lib/validate.ts` for Zod-backed input validation.
- Wrap API routes with `withRateLimit` from `/lib/security/rateLimit.ts` (in-memory, IP keyed; upgrade for distributed environments).

## Environment variables
The Prisma datasource supports separate runtime and migration URLs. The approved Neon PostgreSQL 17 staging database has migrations `000` through `011` applied and validated with zero application rows at the verification point. Production Neon is not provisioned.

Normal application usage requires:

- `DATABASE_URL` – pooled PostgreSQL connection for application runtime access.
- `DIRECT_URL` – direct PostgreSQL connection for separately approved Prisma migration operations.
- `NEXTAUTH_URL` – canonical application URL.
- `NEXTAUTH_SECRET` – NextAuth signing secret.
- `OWNER_LOGIN_ID`, `OWNER_EMAIL`, `OWNER_PASSWORD_HASH` – server-only single-owner identity and credential configuration.
- `QUIZ_BADGE_SECRET` – independent quiz badge signing secret.
- `ADMIN_PASSPHRASE` – independent credential for protected readiness and the admin statistics route.

`OWNER_NAME` is optional. Both Neon URLs must use TLS (`sslmode=require`); `connect_timeout=15` is recommended. Keep all values in an approved secret store, generate unrelated secrets independently, and never commit them. Copy `.env.example` for variable names and placeholders only; see [`docs/ops/single-owner-auth.md`](docs/ops/single-owner-auth.md) for secure hash generation and rotation.

Timeline card uploads (builder-only) still use the legacy Supabase Storage path. Local testing of that legacy path would require:
- `SUPABASE_URL` – Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` – service role key for server-side uploads.
- `SUPABASE_STORAGE_BUCKET` – optional bucket name (defaults to `timeline`).

Do not reuse recovered Supabase secrets or configure these legacy values for production. Timeline upload may remain unavailable until Recovery-03 replaces this code with R2; it is not an acceptance gate for the current baseline.

## Notes
- The project intentionally omits the `/app` directory. Pages Router only.
- Upgrade the in-memory rate limiter before deploying behind multiple instances.
- Public fixed test credentials and quick-login UI have been removed; local and deployed environments use the same server-configured single-owner flow.
- A minimal Netlify build baseline and one code-based credentials-callback rate-limit rule are present, but no Netlify site, deploy, custom domain, or production release has been created. Follow [`docs/ops/netlify-staging.md`](docs/ops/netlify-staging.md) after merge and explicit approval.
- Do not run database migrations in the Netlify build. Any future environment apply is a separate reviewed operation using `DIRECT_URL`.
- Supabase Storage is still used by the timeline upload code. R2 replacement and upload acceptance are Recovery-03 work.
- See [`docs/ops/fresh-start-database.md`](docs/ops/fresh-start-database.md) for the Fresh-start decision, staging procedure, prohibited commands, and rollback policy.
