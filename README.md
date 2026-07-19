# MarryQuest – Next.js Baseline

Recovery baseline for the MarryQuest invitation experience using the **Next.js Pages Router**, TypeScript, Tailwind CSS, and shadcn/ui-inspired primitives. Neon, Netlify, and two-bucket R2 staging baselines are validated; production infrastructure and production-domain gates remain outstanding.

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
- `npm run theme:contrast` – verify the seven public-template semantic color pairs against WCAG contrast targets
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
- **Bloom Pop**, **Luxe Signature**, **Modern Clean**, and **Hanok Calm**

`ThemeProvider` selects a template by `templateKey` and injects CSS variables for typography, spacing, gallery behavior, and semantic public surfaces. Surface, muted text, fields, placeholders, borders, controls, success, warning, and error states use owned foreground/background pairs rather than assuming a light Slate card. This keeps Timeline, Music, RSVP, Guestbook, Quiz, and Food Vote legible across all seven templates.

## Protected readiness

`GET /api/ready` remains protected by the exact `ADMIN_PASSPHRASE` header. A missing or wrong header returns `401`; valid authentication with invalid application configuration, unavailable PostgreSQL, or unavailable storage returns `503`; full readiness returns `200`. The JSON body stays intentionally generic. Operators must use the HTTP status and secret-safe fixed Function log code together. Storage diagnostics distinguish configuration, the private upload bucket, and the public asset bucket without logging an endpoint or bucket name. See [`docs/ops/netlify-staging.md`](docs/ops/netlify-staging.md).

## Validation & rate limiting
- Use `validate`/`assertValid` from `/lib/validate.ts` for Zod-backed input validation.
- Wrap API routes with `withRateLimit` from `/lib/security/rateLimit.ts`. Each wrapped handler has an independent in-memory store and separates counters by HTTP method and client key.
- The limiter is still process-local: serverless instances do not share counters, and cold starts or redeploys reset them. Database counts/constraints remain the final guest-participation protection; use platform/distributed controls for global abuse defense.

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

Timeline card storage requires the following server-only R2 values:

- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` – bucket-scoped S3 credentials.
- `R2_ENDPOINT` – explicit R2 S3 endpoint.
- `R2_UPLOAD_BUCKET` – private, lifecycle-managed original-upload bucket.
- `R2_PUBLIC_BUCKET` – distinct public optimized-asset bucket.
- `R2_PUBLIC_BASE_URL` – public asset origin/custom-domain base URL.

The browser requests a presigned URL, sends the original directly to the private bucket, and calls a small finalize JSON API. Only server-validated 640×640 WebP output is written to the public bucket. No R2 value is a `NEXT_PUBLIC_*` variable. See [`docs/ops/r2-storage.md`](docs/ops/r2-storage.md).

## Notes
- The project intentionally omits the `/app` directory. Pages Router only.
- Upgrade the in-memory rate limiter before deploying behind multiple instances.
- Public fixed test credentials and quick-login UI have been removed; local and deployed environments use the same server-configured single-owner flow.
- The Netlify staging baseline and browser-direct R2 Timeline flow were validated before Recovery-03A. This hotfix performs no Dashboard work or deploy; its merge-commit staging deploy and Timeline smoke remain separate gates.
- Do not run database migrations in the Netlify build. Any future environment apply is a separate reviewed operation using `DIRECT_URL`.
- Netlify must not store the actual direct endpoint: its Production context duplicates the pooled `DATABASE_URL` as a `DIRECT_URL` build-compatibility alias, while actual migration credentials remain in a separately approved operator environment. On Free this alias may also be visible to Functions, but application queries continue to use only `DATABASE_URL`.
- Timeline upload code no longer has a Supabase runtime path or a Netlify multipart body. Timeline section visibility is controlled in Sections, while `TimelinePuzzle.enabled` is derived on explicit save from a valid 5–7-card configuration. Builder preview shows incomplete drafts non-interactively; public SSR omits incomplete Timelines. Existing ready cards stored with `enabled=false` are repaired by pressing Save Timeline without changing the cards or R2 URL.
- Builder dedicated save buttons, the common current-tab save, and `Ctrl/Cmd+S` use the latest rendered draft state. Public Guestbook data is fetched once per published slug/status change with no polling or automatic retry; Builder preview never fetches public Guestbook data.
- The repository declares exactly two Netlify code-based rate limits: credentials callback and timeline-upload wildcard. Recovery-03C does not change them; a future PR-head Preview and stable readiness/theme smoke remain separate deployment gates.
- Netlify credit-based Free usage is governed by [`docs/ops/netlify-credit-controls.md`](docs/ops/netlify-credit-controls.md). The operator initially reported an exhausted balance; Recovery-03C PR #32 later received a successful GitHub Netlify Deploy Preview status. That Preview is evidence that Preview service resumed, but it does not reveal the Dashboard balance or authorize a stable deploy. Local validation does not change the plan or prove a stable release.
- See [`docs/ops/fresh-start-database.md`](docs/ops/fresh-start-database.md) for the Fresh-start decision, staging procedure, prohibited commands, and rollback policy.
