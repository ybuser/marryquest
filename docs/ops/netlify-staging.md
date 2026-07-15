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

## Required environment variables

Configure values through the Netlify environment-variable UI or another approved secret mechanism. Never commit them or paste them into deploy settings that are tracked in source.

- `DATABASE_URL`: pooled Neon staging URL for application runtime queries.
- `DIRECT_URL`: direct URL for Prisma tooling only. The build needs it for Prisma schema parsing, but application queries must continue to use `DATABASE_URL`.
- `NEXTAUTH_URL`: the stable HTTPS staging site URL.
- `NEXTAUTH_SECRET`: unique staging signing secret.
- `OWNER_LOGIN_ID`
- `OWNER_EMAIL`: stable Prisma owner identity; review `single-owner-auth.md` before changing it.
- `OWNER_NAME`
- `OWNER_PASSWORD_HASH`
- `QUIZ_BADGE_SECRET`: independent from `NEXTAUTH_SECRET`.
- `ADMIN_PASSPHRASE`: independent from every other secret.
- `SKIP_PRISMA_GENERATION=false`

Do not use a Deploy Preview URL as the canonical `NEXTAUTH_URL`. Authentication smoke tests must use the stable staging site URL. Environment-variable changes require a redeploy.

Do not configure R2 variables before Recovery-03. The legacy Supabase variables in `.env.example` document the remaining upload code only; they are not approval to place old Supabase secrets into Netlify.

## Dashboard procedure after merge

This is manual work for an explicitly approved staging deployment:

1. Create a staging-only Netlify site and connect the GitHub repository.
2. Select `master` as the production branch for that staging site.
3. Confirm the build command is `npm run build`.
4. Leave the publish directory blank so the Next.js adapter owns its output configuration.
5. Confirm the build uses Node.js 20.
6. Reserve a stable Netlify staging subdomain before setting authentication variables.
7. Set that stable HTTPS URL as `NEXTAUTH_URL`.
8. Configure the validated Neon staging pooled and direct URLs under their correct variable names.
9. Configure the owner and application-security variables listed above with staging-only values.
10. Enter actual values only in the approved secret UI; do not place them in `netlify.toml`, screenshots, tickets, or deploy notes.
11. Trigger the first staging deploy.
12. Confirm the deploy log detects Next.js and applies the OpenNext adapter without a pinned plugin.
13. Confirm Netlify generated the SSR/API function required by Pages Router routes.
14. Inspect deploy post-processing and confirm the credentials callback rate-limit rule was accepted with the intended path, method, window, and aggregation.
15. Check the deploy log for accidental secret or connection-string disclosure.
16. Check public `/api/health` liveness.
17. Check protected `/api/ready` with missing, wrong, and correct admin passphrases.
18. Confirm an incorrect owner login fails with the generic message.
19. Confirm removed public test credentials and quick-login UI are unavailable.
20. Confirm the configured owner can sign in on the stable staging URL.
21. Verify dashboard access, session persistence, sign-out, and post-sign-out protection.
22. Inspect the HTTPS session cookie for the expected Secure, HttpOnly, and SameSite behavior.
23. Confirm external, scheme-relative, malformed, and backslash callback targets cannot redirect away from the staging origin; confirm an internal callback still works.
24. Perform a controlled credentials-callback rate-limit test and confirm excess requests receive HTTP 429. Do not treat local behavior as evidence.
25. Confirm the first successful login creates exactly one owner `User` with the configured `OWNER_EMAIL`, and a second login does not create a duplicate.
26. Record timeline upload as excluded until Recovery-03; do not add a recovered Supabase credential merely to make this check pass.

Also review the team's billing controls before enabling continuous deploys. Keep automatic recharge disabled unless explicitly approved, enable usage notifications, and monitor Edge Function and serverless-function usage.

## Database and deployment gates

- Never run `prisma migrate deploy`, `db push`, or another schema mutation from the Netlify build.
- The staging migration chain was validated as a separate release operation. A Netlify deploy must not repeat it.
- `DIRECT_URL` is not an application runtime connection.
- A successful Deploy Preview is not canonical authentication validation.
- A successful staging deploy does not approve production Neon, a production migration, a custom production domain, DNS changes, or public launch.
- Connect the final production domain, `marryquest.shimyunbo.com`, only in the later production gate. Do not point staging `NEXTAUTH_URL` at that domain.

## Rollback

For a code or deploy regression, roll back to the previous known-good deploy or revert the PR. Do not restore public test credentials, reuse an old `NEXTAUTH_SECRET`, or revert to an old owner password. Correct the target environment variables through the secret store, redeploy, and verify readiness.

No database rollback is part of this baseline: it changes neither the Prisma schema nor migrations. A successful staging login may create or update the single owner `User`; it does not migrate or seed application data.
