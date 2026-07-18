# Netlify staging runbook

## Current state and scope

The stable Netlify staging site has been deployed, and public health, protected readiness, and owner login were validated before Recovery-03. Neon PostgreSQL 17 staging was also validated separately. Production Neon, the production domain, and a production release are not provisioned or approved, and this runbook does not authorize a database migration.

Recovery-03 adds the browser-direct/two-bucket R2 code path only. No R2 bucket, API token, custom asset domain, Netlify R2 variable, or Recovery-03 deploy has been created by this change. Upload acceptance remains a post-merge staging gate. Do not reuse recovered Supabase credentials.

## Repository baseline

`netlify.toml` runs `npm run build` with Node.js 20. It intentionally has no publish directory, adapter pin, migration command, region, or secret. Netlify should detect this Next.js 14 project and apply its maintained OpenNext adapter automatically.

The repository now declares exactly two Netlify Free code-based Edge rate-limit rules:

- `POST /api/auth/callback/credentials`: 10 requests per 60 seconds.
- `POST /api/upload/timeline-card/*`: 20 requests per 60 seconds, covering presign and finalize together.
- Both aggregate by client IP and domain, use the default 429 block behavior, and pass allowed requests through without reading or changing request/response bodies.

These rules are evaluated by Netlify, not by `next dev` or `next start`. A successful local TypeScript check or Next.js build does not prove that the platform accepted the rules. Netlify validates code-based rate limits during deploy post-processing, and an invalid rule does not necessarily fail the deploy. Always inspect the post-processing log and perform a controlled 429 smoke test after deployment.

The two available code-based rule slots are now consumed. Do not add another code rule without changing the approved platform plan or replacing an existing rule. Both declarations still require deploy post-processing inspection and controlled staging 429 tests.

## Public-repository secret isolation

This GitHub repository is public. On the staging-only Netlify site, the `Production` deploy context means the stable staging deployment; it does not mean that production infrastructure exists or is approved.

- Set actual staging database, owner, signing, admin, and R2 values only for the `Production` deploy context.
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
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ENDPOINT`: the explicit HTTPS staging R2 S3 endpoint.
- `R2_UPLOAD_BUCKET`: the private staging temporary-upload bucket.
- `R2_PUBLIC_BUCKET`: the distinct staging optimized-asset bucket.
- `R2_PUBLIC_BASE_URL`: the staging public asset custom-domain base URL.
- `SKIP_PRISMA_GENERATION=false`

The Netlify `DIRECT_URL` alias exists only so `npm ci` postinstall can run `prisma generate` and `npm run build` can parse and generate from the Prisma schema. It does not authorize a migration. Keep the actual Neon direct URL only in an approved operator secret store or a future explicitly approved migration environment. Never run `npm run db:migrate`, `prisma migrate deploy`, `prisma db push`, or `prisma migrate resolve` from a Netlify build or Function. Application queries continue to use only `DATABASE_URL`.

Do not use a Deploy Preview URL as the canonical `NEXTAUTH_URL`. Authentication smoke tests must use the stable staging site URL. Environment-variable changes require a redeploy.

R2 credentials are server-only and must never use a `NEXT_PUBLIC_*` name. Mark the access key, secret key, and any value treated as sensitive by the team as `Contains secret values`. Configure them only after the two staging buckets, bucket-scoped token, lifecycle, CORS, and custom domain in `r2-storage.md` have been reviewed. Unlike Prisma's Netlify-only `DIRECT_URL` pooled alias, `R2_ENDPOINT` is the actual staging S3 API endpoint required by server Functions; it is not a migration credential.

## Deploy Preview and branch-deploy policy

Deploy Previews and branch deploys must never receive actual staging database, owner, signing, admin, or R2 values. The initial policy is to give those contexts public fail-closed placeholders only:

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
R2_ACCOUNT_ID=replace-with-preview-r2-account-id
R2_ACCESS_KEY_ID=replace-with-preview-r2-access-key-id
R2_SECRET_ACCESS_KEY=replace-with-preview-r2-secret-access-key
R2_ENDPOINT=https://replace-with-preview-r2-account-id.r2.cloudflarestorage.com
R2_UPLOAD_BUCKET=replace-with-preview-upload-bucket
R2_PUBLIC_BUCKET=replace-with-preview-public-bucket
R2_PUBLIC_BASE_URL=https://assets-preview.invalid
SKIP_PRISMA_GENERATION=false
```

The `.invalid` hostnames are deliberately non-routable, and every `replace-with-*` value is deliberately rejected at runtime. The build-time CSP/image parser also ignores invalid and placeholder R2 URLs. These values exist only to let dependency installation, Prisma generation, type checking, linting, and compilation run without a shared database, R2 request, or private secret. Preview authentication, direct upload, DB-backed SSR, and readiness are not acceptance targets. Run actual authentication, readiness, and upload smoke only against the stable staging `Production` deploy.

If this fail-closed placeholder environment cannot build, do not provide staging secrets to make the Preview pass. Record the failure and disable Deploy Previews and branch deploys until a preview-safe database or configuration is explicitly approved.

## Dashboard procedure after merge

The site/authentication baseline above is already present. The following is manual Recovery-03 work after merge and explicit staging approval:

1. Complete the two staging buckets, lifecycle, CORS, bucket-scoped token, and asset custom-domain procedure in `r2-storage.md`.
2. Keep the build command `npm run build`, publish directory blank, and Node.js 20.
3. Add the seven actual R2 values to the stable staging `Production` context only. Never place them in All deploys, Deploy Preview, Branch deploy, or Local development contexts.
4. Mark sensitive values as `Contains secret values` and retain `Deploy without sensitive variables`, or at minimum `Require approval`; never use `Deploy without restrictions`.
5. Keep Preview/branch contexts on the public fail-closed placeholders above. Do not bulk-import an environment file.
6. Verify the private bucket CORS origin exactly matches the stable staging origin, without a path or trailing slash.
7. Deploy the exact merged Recovery-03 commit. This is a code deploy, not a database migration.
8. Confirm Netlify applies its maintained Next.js adapter and generates the required Pages Router SSR/API Functions.
9. Inspect deploy post-processing and confirm both rate-limit declarations: credentials 10/60 and upload wildcard 20/60, each grouped by IP and domain.
10. Check build, post-processing, Edge, and Function logs for connection strings, credentials, bucket/endpoint details, and presigned URLs.
11. Check public `/api/health` and protected `/api/ready` with missing, wrong, and correct admin passphrases. Correct auth is 200 only when the DB and both R2 buckets are ready.
12. Reconfirm owner login/session behavior on the stable HTTPS URL.
13. Upload JPEG, PNG, and WebP timeline images and verify the browser sequence is presign JSON → direct R2 PUT → finalize JSON; no original binary may appear in a Netlify Function request.
14. Confirm the returned asset uses the staging custom domain, is 640×640 WebP, persists after explicit Timeline save/reload, and renders on the public invitation.
15. Remove a recognized saved image and confirm its final object is deleted without affecting external/legacy URLs.
16. Perform controlled 429 tests for both credentials and upload rules. Do not treat local behavior or a successful build as platform acceptance.
17. Record any temp/final orphan and readiness behavior without exposing object keys or signed URLs.

Also review the team's billing controls before enabling continuous deploys. Keep automatic recharge disabled unless explicitly approved, enable usage notifications, and monitor Edge Function and serverless-function usage.

## Database and deployment gates

- Never run `prisma migrate deploy`, `db push`, or another schema mutation from the Netlify build.
- The staging migration chain was validated as a separate release operation. A Netlify deploy must not repeat it.
- Netlify's `DIRECT_URL` is the pooled build-compatibility alias, not an application runtime connection or an actual direct endpoint.
- A successful Deploy Preview is not canonical authentication validation.
- A local MinIO upload or successful Netlify build is not proof that R2 CORS, the asset domain, or the upload Edge rule was accepted in staging.
- A successful staging deploy does not approve production Neon, a production migration, a custom production domain, DNS changes, or public launch.
- Connect the final production domain, `marryquest.shimyunbo.com`, only in the later production gate. Do not point staging `NEXTAUTH_URL` at that domain.

## Rollback

For a code or deploy regression, roll back to the previous known-good deploy or revert the PR. Do not restore public test credentials, Supabase secrets, the old multipart route, reuse an old `NEXTAUTH_SECRET`, or revert to an old owner password. Correct the target environment variables through the secret store, redeploy, and verify readiness. Do not bulk-delete public R2 objects until their Timeline DB URLs have been compared.

No database rollback is part of this baseline: it changes neither the Prisma schema nor migrations. A successful staging login may create or update the single owner `User`; it does not migrate or seed application data.
