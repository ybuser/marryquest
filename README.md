# MarryQuest – Next.js Baseline

Production-ready baseline for the MarryQuest invitation experience using the **Next.js Pages Router**, TypeScript, Tailwind CSS, and shadcn/ui-inspired primitives. Security headers, validation, and rate limiting are included by default.

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
Normal application usage requires:

- `DATABASE_URL` – pooled Neon PostgreSQL connection for the application runtime.
- `DIRECT_URL` – direct Neon PostgreSQL connection for Prisma migrations.
- `NEXTAUTH_SECRET` – NextAuth signing secret.

Both database connections must use TLS (`sslmode=require`); `connect_timeout=15` is recommended. Keep all values in an approved secret store and never commit them.

Timeline card uploads (builder-only) use Supabase Storage. Configure:
- `SUPABASE_URL` – Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` – service role key for server-side uploads.
- `SUPABASE_STORAGE_BUCKET` – optional bucket name (defaults to `timeline`).

Supabase Storage is still used by the current upload code. Its replacement is planned for a later Recovery PR and is not part of the database fresh-start work.

## Notes
- The project intentionally omits the `/app` directory. Pages Router only.
- Upgrade the in-memory rate limiter before deploying behind multiple instances.
- Do not run database migrations in the Netlify build. Apply them separately with `npm run db:migrate` using `DIRECT_URL` after validating an empty staging database.
- See [`docs/ops/fresh-start-database.md`](docs/ops/fresh-start-database.md) for the Fresh-start decision, staging procedure, prohibited commands, and rollback policy.
