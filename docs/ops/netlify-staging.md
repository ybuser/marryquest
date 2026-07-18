# Netlify staging runbook

## Current state and scope

The stable Netlify staging site, public health, protected readiness, owner login, and browser-direct two-bucket R2 Timeline flow were validated before Recovery-03A. Neon PostgreSQL 17 staging was also validated separately. Production Neon, production R2, the production domain, and a production release are not provisioned or approved, and this runbook does not authorize a database migration.

Recovery-03A fixes Timeline readiness and rendering without changing R2, Netlify environment values, rate-limit rules, or Dashboard resources. Its PR-head Deploy Preview is a pre-merge packaging, secret-scanning, and rate-rule post-processing gate; the affected Timeline flow must then be rechecked after the automatic merge-commit staging deploy. Do not reuse recovered Supabase credentials.

## Repository baseline

`netlify.toml` runs `npm run build` with Node.js 20. It intentionally has no publish directory, adapter pin, migration command, region, or secret. Netlify should detect this Next.js 14 project and apply its maintained OpenNext adapter automatically.

The repository now declares exactly two Netlify Free code-based Edge rate-limit rules:

- `POST /api/auth/callback/credentials`: 10 requests per 60 seconds.
- `POST /api/upload/timeline-card/*`: 20 requests per 60 seconds, covering presign and finalize together.
- Both aggregate by client IP and domain, use the default 429 block behavior, and pass allowed requests through without reading or changing request/response bodies.

These rules are evaluated by Netlify, not by `next dev` or `next start`. A successful local TypeScript check or Next.js build does not prove that the platform accepted the rules. Netlify validates code-based rate limits during deploy post-processing, and an invalid rule does not necessarily fail the deploy. Inspect the PR-head Preview post-processing before merge, then perform a controlled 429 smoke test against the automatic stable deploy after merge.

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

R2 credentials are server-only and must never use a `NEXT_PUBLIC_*` name. Mark the access key, secret key, and any value treated as sensitive by the team as `Contains secret values`. For a new or replacement environment, configure them only after the two staging buckets, bucket-scoped token, lifecycle, CORS, and custom domain in `r2-storage.md` have been created and verified, and do so before the first consuming merge. Unlike Prisma's Netlify-only `DIRECT_URL` pooled alias, `R2_ENDPOINT` is the actual staging S3 API endpoint required by server Functions; it is not a migration credential.

## Deploy Preview and branch-deploy policy

Deploy Previews and branch deploys must never receive actual staging database, owner, signing, admin, or R2 values. Give those contexts public fail-closed placeholders that satisfy only the build-time shape described below:

| Variable | Preview shape and fail-closed semantics |
| --- | --- |
| `DATABASE_URL`, `DIRECT_URL` | The same syntactically valid PostgreSQL URL with public dummy credentials, a non-routable `.invalid` hostname, TLS required, and a 15-second timeout. It exists only for Prisma generation/schema parsing. |
| `NEXTAUTH_URL` | A syntactically valid HTTPS URL under `.invalid`, never a deploy or stable-site URL. |
| `NEXTAUTH_SECRET`, `QUIZ_BADGE_SECRET`, `ADMIN_PASSPHRASE` | Distinct public `replace-with-*` sentinels that runtime validation rejects. |
| `OWNER_LOGIN_ID`, `OWNER_PASSWORD_HASH` | Public `replace-with-*` sentinels that cannot authenticate. |
| `OWNER_EMAIL` | A syntactically valid email-shaped public sentinel whose local part begins with `replace-with-`; use a Preview-specific value different from `.env.example`. |
| `OWNER_NAME` | A non-sensitive display placeholder. |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Distinct public `replace-with-*` sentinels rejected by storage configuration. |
| `R2_ENDPOINT`, `R2_PUBLIC_BASE_URL` | Syntactically valid HTTPS placeholder URLs that are non-routable or deliberately rejected by the build/runtime validators. |
| `R2_UPLOAD_BUCKET`, `R2_PUBLIC_BUCKET` | Distinct public placeholder names; they must not name a real bucket. |
| `SKIP_PRISMA_GENERATION` | Boolean false so normal Prisma generation remains exercised. |

Choose context-specific placeholder literals in the Netlify UI and do not copy their exact assignments into this public repository, deploy logs, or tickets. In particular, do not reuse the exact `.env.example` owner-email sentinel as a Netlify Preview value; exact-value duplication can be reported by Netlify secret scanning even when the value is intentionally public. Keep secret scanning and smart detection enabled, do not omit the Preview placeholders to evade scanning, and do not add a broad safelist.

The `.invalid` hostnames are deliberately non-routable, and every `replace-with-*` value is deliberately rejected at runtime. The build-time CSP/image parser also ignores invalid and placeholder R2 URLs. These values exist only to let dependency installation, Prisma generation, type checking, linting, and compilation run without a shared database, R2 request, or private secret. Preview authentication, direct upload, DB-backed SSR, and readiness are not acceptance targets. Run actual authentication, readiness, and upload smoke only against the stable staging `Production` deploy.

If this fail-closed placeholder environment cannot build, do not provide staging secrets to make the Preview pass. Record the failure and disable Deploy Previews and branch deploys until a preview-safe database or configuration is explicitly approved.

## Initial or replacement R2 rollout procedure

For a new or replacement storage environment, follow this order because merging to `master` automatically starts the stable staging `Production`-context deploy:

1. Complete the focused PR review fix.
2. Create the private upload and public asset staging buckets.
3. Configure the exact private-bucket CORS origin and the one-day lifecycle.
4. Create the staging-only, bucket-scoped Object Read & Write token.
5. Connect and verify the public staging custom domain.
6. Add the seven actual R2 values to the stable staging `Production` context only. Mark sensitive values as `Contains secret values`; never place actual values in All deploys, Deploy Preview, Branch deploy, or Local development contexts.
7. Keep Preview/branch contexts on context-specific public fail-closed values. Keep secret scanning enabled, retain `Deploy without sensitive variables` or at minimum `Require approval`, never use `Deploy without restrictions`, and do not bulk-import an environment file.
8. Push the review-fix commit and require the PR-head Deploy Preview to pass Next.js/OpenNext packaging, secret scanning, and post-processing that recognizes credentials 10/60 and upload wildcard 20/60, both grouped by IP and domain.
9. Merge only after the Preview is green.
10. Confirm the merge commit's automatic stable staging `Production`-context deploy succeeds with the maintained Next.js adapter and required Pages Router SSR/API Functions.
11. On the stable HTTPS URL, verify `/api/health`, protected `/api/ready`, owner login/session, JPEG/PNG/WebP presign → direct R2 PUT → finalize, explicit save/reload/public rendering, and controlled 429 behavior for both rules.

During both Preview and stable deploys, inspect build, post-processing, Edge, and Function logs for connection strings, credentials, bucket/endpoint details, and presigned URLs. For the stable upload smoke, confirm the original binary never appears in a Netlify Function request and the returned asset is a 640×640 WebP on the staging custom domain. When a saved image is removed, confirm only the DB/UI reference is removed; the public final object remains an orphan candidate for Recovery-04 reconciliation. Record temp/final orphan and readiness behavior without exposing object keys or signed URLs.

Cloudflare resources and stable Netlify `Production`-context values are intentionally prepared before the first consuming merge. Existing deployed code does not consume them until that code reaches `master`. Keep the build command `npm run build`, publish directory blank, and Node.js 20 throughout this procedure.

## Recovery-03A Timeline hotfix rollout

The current staging R2 resources and Production-context values remain unchanged:

1. Require the PR-head Deploy Preview to pass Next.js/OpenNext packaging, secret scanning, and both existing code-based rate-limit declarations.
2. Merge only after that Preview is green; do not treat Preview DB-backed SSR as acceptance.
3. Confirm the merge commit's automatic stable staging deploy succeeds.
4. Verify `/api/health` and protected `/api/ready` return 200, then sign in as the owner.
5. Open the affected invitation, confirm the Timeline section is enabled, complete 5–7 valid cards, and press Save Timeline. A legacy ready set stored disabled must repair without editing its cards or `photoUrl`.
6. Confirm live preview shows image cards but performs no Timeline attempt or Music request.
7. Confirm the published page shows the image Timeline, contains no readiness placeholder, and accepts a real Timeline attempt.
8. Confirm the R2 object and persisted `photoUrl` remain intact and smoke other invitation features.

## Recovery-03B save and Guestbook hotfix rollout

The code change does not alter the staging database schema, R2 configuration, or the two existing Netlify code-based Edge rules. Keep the PR Draft until its fail-closed Deploy Preview completes build, secret scanning, Next.js/OpenNext packaging, and rule post-processing.

After merge, use the automatic stable staging deploy for this manual smoke:

1. Confirm the merge commit's automatic deploy, then verify `/api/health` and protected `/api/ready` return 200.
2. Open an existing ready Timeline, change one photo, and then change a second photo without saving between the edits.
3. Use the common current-tab save, reload, and confirm both latest photo URLs remain.
4. Repeat with `Ctrl/Cmd+S`, reload, and confirm the latest text, description, and photo changes remain.
5. Confirm the dedicated Timeline Save produces the same saved payload/result and that repeated shortcuts during an in-flight save do not create duplicate PATCH requests.
6. Open a published invitation and record the Guestbook network traffic. Expect one initial `GET /api/guestbook?slug=...` only.
7. Leave the page idle for at least 30 seconds. Confirm there is no additional Guestbook GET, no automatic retry, no 429 loop, and no request storm in Function logs.
8. Submit one allowed Guestbook entry and confirm it is prepended locally without a follow-up GET. Confirm RSVP, Timeline attempt, Music Vote, and other guest APIs still respond normally.
9. Confirm Guestbook GET traffic does not consume Guestbook POST/PATCH quota or another wrapped API route's quota. The application limiter is process-local, so this is scope isolation—not distributed global protection.

Do not supply actual database, owner, signing, admin, or R2 values to Deploy Preview. DB-backed Preview behavior is not an acceptance target; perform the checks above only on the stable staging `Production`-context deploy after merge.

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
