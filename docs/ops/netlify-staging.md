# Netlify staging runbook

## Current state and scope

This repository contains only a Netlify deployment baseline. A Netlify site has not been created or deployed by this change, no production domain is connected, and production Neon is not provisioned. The existing Neon PostgreSQL 17 staging schema was validated separately; this runbook does not authorize a database migration or production release.

The current timeline upload implementation still targets Supabase Storage. Do not reuse recovered Supabase credentials. Upload acceptance is excluded until Recovery-03 replaces that implementation with R2.

## Repository baseline

`netlify.toml` runs `npm run build` with Node.js 20. It intentionally has no publish directory, adapter pin, migration command, region, or secret. Netlify should detect this Next.js 14 project and apply its maintained OpenNext adapter automatically.

The code-based Edge rule protects only `POST /api/auth/callback/credentials`:

- 10 requests per 60 seconds
- aggregated by client IP and domain
- default block behavior, returning HTTP 429 above the limit
- no request or response body transformation

This rule is evaluated by Netlify, not by `next dev` or `next start`. A successful local TypeScript check or Next.js build does not prove that the platform accepted the rule. Netlify validates code-based rate limits during deploy post-processing, and an invalid rule does not necessarily fail the deploy. Always inspect the post-processing log and perform a controlled 429 smoke test after deployment.

The credentials rule consumes one of the two Netlify Free code-based rate-limit rules. Keep the second rule unused in this Recovery step; it is reserved for Recovery-03 upload protection.

## Public-repository secret isolation

This GitHub repository is public. On the staging-only Netlify site, the `Production` deploy context means the stable staging deployment; it does not mean that production infrastructure exists or is approved.

- Set actual staging database, owner, signing, and admin values only for the `Production` deploy context.
- Never set those actual values for `All deploys`, `Deploy Previews`, `Branch deploys`, or `Local development`.
- Mark every sensitive value as `Contains secret values` in the Netlify UI.
- Prefer the `Deploy without sensitive variables` policy for untrusted deploys. The minimum acceptable policy is `Require approval`. Never select `Deploy without restrictions`.
- Do not rely on the sensitive-variable policy alone. A pull-request author or connected Git provider account associated with a site member can be treated as trusted, so deploy-context separation remains mandatory.
- Do not bulk-import an environment file into all contexts. In particular, Netlify CLI `.env` import assigns the same values to all scopes and deploy contexts.
- Never put an actual secret or connection string in `netlify.toml`.

Netlify's granular environment-variable scopes are documented for Pro and Enterprise plans. This Free-plan runbook does not assume that a value can be restricted to Builds-only or Functions-only. Treat each `Production` contextual value as potentially available to both the build and serverless Functions. Deploy-context isolation and a minimal secret inventory are the primary defenses. See Netlify's [environment-variable overview](https://docs.netlify.com/build/environment-variables/overview/) and [sensitive-variable policy](https://docs.netlify.com/build/environment-variables/get-started/#sensitive-variable-policy).

## Required environment variables

Configure values through the Netlify environment-variable UI or another approved secret mechanism. Never commit them or paste them into deploy settings that are tracked in source.

- `DATABASE_URL`: pooled Neon staging URL for application runtime queries.
- `DIRECT_URL`: on this Netlify site only, duplicate the exact pooled `DATABASE_URL` value as a build-compatibility alias. Do not store the actual Neon direct endpoint in Netlify.
- `NEXTAUTH_URL`: the stable HTTPS staging site URL.
- `NEXTAUTH_SECRET`: unique staging signing secret.
- `OWNER_LOGIN_ID`
- `OWNER_EMAIL`: stable Prisma owner identity; review `single-owner-auth.md` before changing it.
- `OWNER_NAME`
- `OWNER_PASSWORD_HASH`
- `QUIZ_BADGE_SECRET`: independent from `NEXTAUTH_SECRET`.
- `ADMIN_PASSPHRASE`: independent from every other secret.
- `SKIP_PRISMA_GENERATION=false`

The Netlify `DIRECT_URL` alias exists only so `npm ci` postinstall can run `prisma generate` and `npm run build` can parse and generate from the Prisma schema. It does not authorize a migration. Keep the actual Neon direct URL only in an approved operator secret store or a future explicitly approved migration environment. Never run `npm run db:migrate`, `prisma migrate deploy`, `prisma db push`, or `prisma migrate resolve` from a Netlify build or Function. Application queries continue to use only `DATABASE_URL`.

Do not use a Deploy Preview URL as the canonical `NEXTAUTH_URL`. Authentication smoke tests must use the stable staging site URL. Environment-variable changes require a redeploy.

Do not configure R2 variables before Recovery-03. The legacy Supabase variables in `.env.example` document the remaining upload code only; they are not approval to place old Supabase secrets into Netlify.

## Deploy Preview and branch-deploy policy

Deploy Previews and branch deploys must never receive actual staging database, owner, signing, or admin values. The initial policy is to give those contexts public fail-closed placeholders only:

```text
DATABASE_URL=postgresql://preview_user:preview_password@preview-pooler.invalid/preview_db?sslmode=require&connect_timeout=15
DIRECT_URL=postgresql://preview_user:preview_password@preview-pooler.invalid/preview_db?sslmode=require&connect_timeout=15
NEXTAUTH_URL=https://preview.invalid
NEXTAUTH_SECRET=replace-with-preview-nextauth-secret
OWNER_LOGIN_ID=replace-with-preview-owner-login-id
OWNER_EMAIL=replace-with-owner-email@example.com
OWNER_NAME=Preview Placeholder
OWNER_PASSWORD_HASH=replace-with-preview-generated-scrypt-hash
QUIZ_BADGE_SECRET=replace-with-preview-quiz-badge-secret
ADMIN_PASSPHRASE=replace-with-preview-admin-passphrase
SKIP_PRISMA_GENERATION=false
```

The `.invalid` database hostname is deliberately non-routable, and every `replace-with-*` value is deliberately rejected at runtime. These values exist only to let dependency installation, Prisma generation, type checking, linting, and compilation run without a shared database or private secret. Preview authentication, DB-backed SSR, and readiness are not acceptance targets. Run the actual authentication and readiness smoke tests only against the stable staging `Production` deploy.

If this fail-closed placeholder environment cannot build, do not provide staging secrets to make the Preview pass. Record the failure and disable Deploy Previews and branch deploys until a preview-safe database or configuration is explicitly approved.

## Dashboard procedure after merge

This is manual work for an explicitly approved staging deployment:

1. Create a staging-only Netlify site and connect the GitHub repository.
2. Select `master` as the production branch for that staging site.
3. Confirm the build command is `npm run build`.
4. Leave the publish directory blank so the Next.js adapter owns its output configuration.
5. Confirm the build uses Node.js 20.
6. Reserve a stable Netlify staging subdomain before setting authentication variables.
7. Set that stable HTTPS URL as `NEXTAUTH_URL`.
8. Set the actual pooled staging URL as `DATABASE_URL` in the `Production` deploy context only, then duplicate that same pooled value as the Netlify-only `DIRECT_URL` alias.
9. Configure the owner and application-security values in the `Production` deploy context only, and mark sensitive entries as `Contains secret values`.
10. Set the sensitive-variable policy to `Deploy without sensitive variables`, or at minimum `Require approval`; verify `Deploy without restrictions` is not selected.
11. Configure only the public fail-closed placeholders for Deploy Previews and branch deploys. Do not set actual values for Local development or All deploys.
12. Enter actual values only in the approved secret UI; do not bulk-import them or place them in `netlify.toml`, screenshots, tickets, or deploy notes.
13. Trigger the first staging deploy.
14. Confirm the deploy log detects Next.js and applies the OpenNext adapter without a pinned plugin.
15. Confirm Netlify generated the SSR/API function required by Pages Router routes.
16. Inspect deploy post-processing and confirm the credentials callback rate-limit rule was accepted with the intended path, method, window, and aggregation.
17. Check the deploy log for accidental secret or connection-string disclosure.
18. Check public `/api/health` liveness.
19. Check protected `/api/ready` with missing, wrong, and correct admin passphrases.
20. Confirm an incorrect owner login fails with the generic message.
21. Confirm removed public test credentials and quick-login UI are unavailable.
22. Confirm the configured owner can sign in on the stable staging URL.
23. Verify dashboard access, session persistence, sign-out, and post-sign-out protection.
24. Inspect the HTTPS session cookie for the expected Secure, HttpOnly, and SameSite behavior.
25. Confirm external, scheme-relative, malformed, and backslash callback targets cannot redirect away from the staging origin; confirm an internal callback still works.
26. Perform a controlled credentials-callback rate-limit test and confirm excess requests receive HTTP 429. Do not treat local behavior as evidence.
27. Confirm the first successful login creates exactly one owner `User` with the configured `OWNER_EMAIL`, and a second login does not create a duplicate.
28. Record timeline upload as excluded until Recovery-03; do not add a recovered Supabase credential merely to make this check pass.

Also review the team's billing controls before enabling continuous deploys. Keep automatic recharge disabled unless explicitly approved, enable usage notifications, and monitor Edge Function and serverless-function usage.

## Database and deployment gates

- Never run `prisma migrate deploy`, `db push`, or another schema mutation from the Netlify build.
- The staging migration chain was validated as a separate release operation. A Netlify deploy must not repeat it.
- Netlify's `DIRECT_URL` is the pooled build-compatibility alias, not an application runtime connection or an actual direct endpoint.
- A successful Deploy Preview is not canonical authentication validation.
- A successful staging deploy does not approve production Neon, a production migration, a custom production domain, DNS changes, or public launch.
- Connect the final production domain, `marryquest.shimyunbo.com`, only in the later production gate. Do not point staging `NEXTAUTH_URL` at that domain.

## Rollback

For a code or deploy regression, roll back to the previous known-good deploy or revert the PR. Do not restore public test credentials, reuse an old `NEXTAUTH_SECRET`, or revert to an old owner password. Correct the target environment variables through the secret store, redeploy, and verify readiness.

No database rollback is part of this baseline: it changes neither the Prisma schema nor migrations. A successful staging login may create or update the single owner `User`; it does not migrate or seed application data.
