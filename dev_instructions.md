# MarryQuest Dev Instructions

Last updated: 2026-07-18

This file is the handoff document for new Codex sessions. Treat it as the current source of truth for project state, recent architectural decisions, and operational rules. Older logs and temporary drift-audit files were intentionally cleaned up.

## 1. Product Summary

MarryQuest is a wedding invitation builder and public invitation site.

- Authenticated users manage invitations in `/dashboard` and `/builder/[id]`.
- Guests interact with published invitations at `/[slug]`.
- The product focuses on interactive invitation experiences, not static pages.

Current guest-facing features:

- Invitation sections
- RSVP
- Guestbook
- Quiz
- Timeline puzzle
- Music voting
- Food voting
- Gallery display
- Map / accounts / info sections

## 2. Tech Stack

- Next.js 14, Pages Router only
- React 18
- TypeScript
- Tailwind CSS
- NextAuth
- Prisma ORM
- PostgreSQL via Prisma
- Managed provider: Neon; staging is provisioned and schema-validated, while production is not provisioned
- Cloudflare R2 two-bucket Timeline storage; the staging browser-direct flow was validated before Recovery-03A
- Zod for validation

Do not introduce App Router patterns unless explicitly requested. The current app is Pages Router only.

## 3. Core Routes

Public routes:

- `/`
- `/login`
- `/[slug]`

Authenticated routes:

- `/dashboard`
- `/builder/[id]`

Main API areas:

- `/api/invitations`
- `/api/invitations/[id]`
- `/api/invitations/[id]/sections`
- `/api/invitations/[id]/slug`
- `/api/invitations/[id]/status`
- `/api/invitations/[id]/rsvp-summary`
- `/api/guestbook`
- `/api/guestbook/[entryId]`
- `/api/quiz/[invitationId]`
- `/api/quiz/attempt`
- `/api/timeline/[invitationId]`
- `/api/timeline/attempt`
- `/api/music`
- `/api/music/add`
- `/api/music/vote`
- `/api/food-vote`
- `/api/food-vote/[invitationId]`
- `/api/food-vote/vote`
- `/api/upload/timeline-card/presign`
- `/api/upload/timeline-card/finalize`

## 4. Auth Model

Authentication is single-owner only. There is no public signup flow or fixed development fallback credential.

- `lib/auth.ts` uses a NextAuth Credentials provider with `loginId` and `password`.
- Owner identity and the versioned scrypt password hash come from server-only `OWNER_*` environment variables.
- Successful login upserts a Prisma `User` by the normalized, stable `OWNER_EMAIL` only after both credential checks succeed.
- Sessions continue to use the NextAuth JWT strategy, and protected pages/APIs use `requirePageAuth` and `requireApiAuth`.
- Public test accounts, quick-login UI, and repository-stored plaintext credentials were removed.
- `/api/admin/invitations/[id]/stats` and protected `/api/ready` use the shared exact-match `ADMIN_PASSPHRASE` verifier. This credential is separate from the main owner login.
- See `docs/ops/single-owner-auth.md` for hash generation, rotation, and lockout recovery.

## 5. Dashboard and Builder State

Dashboard:

- Search and status filters are implemented.
- Invitation cards support quick open, public page open, and copy URL.
- A dashboard walkthrough is available from the header.

Builder:

- Tabs: `Basic`, `Sections`, `Guestbook`, `Quiz`, `Timeline`, `Publish`, `Export`
- Draft editing model with explicit save per tab
- `Ctrl/Cmd + S` saves the current tab
- Live preview is on the right side
- Live preview uses its own scroll container and should not scroll the whole page
- Builder header has a `...` menu with:
  - walkthrough
  - copy builder link

Current builder extras:

- Guestbook moderation supports hide/show and delete with confirmation
- Builder interactions can auto-focus related preview content
- Timeline builder uploads originals directly to a private S3-compatible bucket and applies the server-finalized public WebP URL to the draft
- Timeline visibility is controlled only by the Timeline entry in the Sections tab. `TimelinePuzzle.enabled` is a server-derived readiness flag, not a user toggle.
- A Timeline explicit save accepts either zero cards or a ready set of 5–7 valid cards. Builder preview displays incomplete draft cards without enabling guest Timeline or Music APIs.
- Dedicated tab saves, the common current-tab save, and `Ctrl/Cmd+S` dispatch from the latest rendered draft state. The keyboard listener is registered once and calls the current dispatcher through a ref.

## 6. Walkthrough System

There is a reusable guided walkthrough system in:

- `components/walkthrough/GuidedWalkthrough.tsx`

Current walkthrough entry points:

- Dashboard header button
- Builder header `...` menu

Behavior:

- Target highlighting
- Step progress
- Smart tooltip placement
- Next / back / skip / finish
- Escape and arrow-key support

## 7. Public Invitation Rendering

`components/invitation/InvitationPage.tsx` is the main invitation renderer.

Current section keys handled there:

- `hero`
- `info`
- `details`
- `maps`
- `gallery`
- `accounts`
- `timeline`
- `foodVote`
- `guestbook`
- `rsvp`

Templates currently supported:

- `mono`
- `editorial`
- `film`
- `bloom`
- `luxe`
- `modern`
- `hanok`

Template tokens live in `components/theme/tokens.ts`.

## 8. Database and Prisma Rules

Prisma source of truth:

- `prisma/schema.prisma`

Do not treat any other Prisma schema snapshot as authoritative. Temporary drift-audit schema snapshots were removed during cleanup.

Current migration history:

- `000_init`
- `001_add_attendee_name`
- `002_add_quiz`
- `003_add_invitation_deleted_at`
- `004_add_timeline_music`
- `005_hotfix_timeline_photo_correct_order`
- `006_align_timeline_card_columns`
- `007_session_limits_voterKey`
- `008_food_vote`
- `009_add_template_keys`
- `010_align_supabase_drift`
- `011_align_timeline_card_order_default`

Current important schema details:

- `Invitation.deletedAt` exists and public queries must respect it
- `Invitation.status` is `draft`, `published`, or `private`
- `TimelineCard.text` maps to DB column `title`
- `TimelineCard.description` maps to DB column `shortDescription`
- `TimelineCard.description` is non-null in Prisma and DB
- `RSVPResponse.attendeeName` defaults to `""`
- `FoodVote` unique index is mapped as `FoodVote_invitationId_voterKey_uniq`

Fresh-start database decision:

- The previous Supabase backup did not contain the MarryQuest `public` application schema or data.
- Existing application data is not imported, and no seed invitation is created automatically.
- `prisma/schema.prisma` is the source of truth for the current data model.
- `prisma/migrations` is the source of truth for reproducing that model in an empty database.

If you change the database:

1. Edit `prisma/schema.prisma`
2. Create a proper Prisma migration
3. Complete the non-database-mutating preflight in `docs/ops/fresh-start-database.md`
4. Only after every preflight command succeeds, apply the complete migration chain to an empty staging database
5. Confirm the database-to-schema Prisma diff is empty

Neon connection state and design:

- `prisma/schema.prisma` already supports separate `DATABASE_URL` and `DIRECT_URL` values.
- Neon staging PostgreSQL 17 is provisioned. Migrations `000` through `011`, migration checksums/history, catalog invariants, an empty DB-to-schema diff, pooled/direct connectivity, and zero application rows were validated at the Recovery-01 staging gate.
- `DATABASE_URL` is the pooled application runtime connection and `DIRECT_URL` is the direct Prisma migration connection. Both require `sslmode=require`; `connect_timeout=15` is recommended.
- Production Neon is not provisioned. Staging validation does not approve a production database or migration.
- Do not rerun shared staging migrations as part of application builds or routine development. Any future database promotion requires the reviewed preflight and explicit environment-specific approval in the runbook.
- Never use `prisma db push` for shared environments. `prisma migrate resolve` requires explicit maintainer and database-owner approval after the database state is verified.
- Follow `docs/ops/fresh-start-database.md` for the full staging procedure and rollback policy.

## 9. Guest Identity, Limits, and Anti-Abuse

Guest participation is built around the `mq_guest` cookie.

Relevant file:

- `lib/guestKey.ts`

Current patterns:

- RSVP is limited by `voterKey`
- Guestbook is limited by `voterKey`
- Music vote is unique per invitation and voter
- Food vote is unique per invitation and voter
- Rate limit code can use `mq_guest` through `keyFn`

Important behavior:

- Guestbook can allow one extra entry when a valid `quizPerfect` badge token is present
- Quiz badge token signing requires its own `QUIZ_BADGE_SECRET`; it never falls back to `NEXTAUTH_SECRET`
- Public Guestbook entries are fetched once when a published slug/status becomes active. Loading, entry, language, or unrelated parent rerenders do not poll or retry the endpoint; Preview mode only synchronizes its supplied entries and performs no network fetch.
- Each `withRateLimit()` wrapper owns its own request store, and keys within that store include the HTTP method. One handler's traffic cannot consume another handler's quota, and a Guestbook GET cannot consume Guestbook POST/PATCH quota.
- These stores remain process-memory only. They are independent per serverless instance and reset on cold start/redeploy, so they are not distributed abuse protection. Guestbook/RSVP counts and MusicVote/FoodVote database constraints remain the final integrity boundary; the separate Netlify auth/upload rules remain platform controls.

## 10. Image and Storage Notes

Timeline image upload is implemented in:

- `lib/storage/*`
- `pages/api/upload/timeline-card/presign.ts`
- `pages/api/upload/timeline-card/finalize.ts`

Current code behavior:

- Upload requires owner authentication and a non-deleted owned invitation.
- The browser sends JSON to the presign API, PUTs the original directly to the private bucket, then sends JSON to finalize. The original binary does not cross a Netlify Function body.
- Inputs are limited to jpeg/png/webp and 10 MiB, then rechecked from stored object metadata and actual Sharp decode.
- The server applies an 80-megapixel input limit and creates a metadata-free square `640x640` WebP at quality 82.
- Temporary and final keys are server-derived; finalize is idempotent for one upload ID.
- Timeline save changes PostgreSQL only. It never deletes a public final R2 object on the request path because a database-reference check and object deletion cannot be made atomic across PostgreSQL and R2.
- `next.config.js` derives narrow R2 CSP origins and a public `timeline/**` image pattern from validated build-time values. Supabase image/connect patterns were removed.

Current operational state and limitations:

- The two-bucket R2 staging flow, server readiness, and browser-direct upload baseline were completed before Recovery-03A. Production R2 remains a separate gate.
- Recovery-03A changes Timeline activation/readiness and rendering only. Before merge, its PR-head Deploy Preview must pass Next.js/OpenNext packaging, secret scanning, and post-processing for both existing rate-limit rules. After merge, verify the automatic stable deploy and rerun readiness plus Timeline save/preview/public/attempt smoke.
- Gallery photos continue to render from DB URLs; there is no Gallery upload flow.
- Finalized-before-save objects and images removed by a later Timeline save are retained as orphan candidates; live-asset preservation takes priority over immediate storage reclamation. Invitation soft-delete and Gallery cleanup also require later reconciliation work.
- Follow `docs/ops/r2-storage.md` before provisioning or deploying storage.

## 11. Environment Variables

Required for normal local app usage:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `OWNER_LOGIN_ID`
- `OWNER_EMAIL`
- `OWNER_PASSWORD_HASH`
- `QUIZ_BADGE_SECRET`
- `ADMIN_PASSPHRASE`

`OWNER_NAME` is optional. Treat `OWNER_PASSWORD_HASH` as sensitive configuration even though it is not plaintext. Generate every signing/passphrase secret independently; never reuse a value or expose these variables through `NEXT_PUBLIC_*`. See `.env.example` for names and placeholders only.

The Prisma datasource uses `DATABASE_URL` for application runtime access and `DIRECT_URL` for migration access. The validated Neon staging environment uses pooled and direct connections respectively; production values do not exist yet.

Netlify is a deliberate exception: do not store the actual direct endpoint there. Configure its stable staging `Production` context with the pooled `DATABASE_URL` value duplicated as `DIRECT_URL` only for Prisma generation/build compatibility; keep actual migration credentials in a separately approved operator environment. Actual staging secrets must not be placed in Netlify Preview, branch, local, or all-deploy contexts.

Required if using timeline uploads:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ENDPOINT`
- `R2_UPLOAD_BUCKET`
- `R2_PUBLIC_BUCKET`
- `R2_PUBLIC_BASE_URL`

The two bucket names must differ. R2 credentials stay server-only and must never use `NEXT_PUBLIC_*`. Production endpoints/base URLs require HTTPS; an HTTP loopback MinIO endpoint is allowed only in development/test.

Optional:

- `OWNER_NAME` is optional and normalizes to `null` when missing or blank
- `SKIP_PRISMA_GENERATION`

Use quoted values in `.env` for safety, especially for URLs and secrets.

## 12. Key Files

High-signal files for future sessions:

- `lib/auth.ts`
- `lib/security/ownerAuth.ts`
- `lib/security/passwordHash.js`
- `lib/security/internalRedirect.ts`
- `lib/security/adminPassphrase.ts`
- `pages/login.tsx`
- `pages/api/ready.ts`
- `pages/dashboard/index.tsx`
- `pages/builder/[id].tsx`
- `components/i18n/LanguageProvider.tsx`
- `components/i18n/LanguageToggle.tsx`
- `components/walkthrough/GuidedWalkthrough.tsx`
- `components/invitation/InvitationPage.tsx`
- `components/invitation/sections/MapButtons.tsx`
- `components/invitation/sections/TimelineSection.tsx`
- `lib/storage/index.ts`
- `pages/api/upload/timeline-card/presign.ts`
- `pages/api/upload/timeline-card/finalize.ts`
- `pages/api/guestbook/[entryId].ts`
- `components/theme/tokens.ts`
- `prisma/schema.prisma`
- `.eslintrc.json`
- `next.config.js`

## 13. Validation Commands

Use these after meaningful changes:

```powershell
npm ci
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm run lint
npm run build
```

For DB changes:

```powershell
npx prisma migrate deploy
npx prisma migrate status
```

Fresh-start validation on 2026-07-12 used disposable PostgreSQL 17.10. Migrations `000` through `011`, Prisma validation/generation/status, typecheck, and the production build succeeded; the final database-to-schema diff was empty. The same chain was subsequently applied to the approved Neon PostgreSQL 17 staging database and its migration checksums, catalog, empty diff, pooled/direct access, and zero application rows were verified. Production Neon remains unprovisioned. Next.js 14 ESLint tooling was validated on 2026-07-12 with the root `.eslintrc.json` extending `next/core-web-vitals`; `npm run lint` executed lint rules non-interactively and exited with code `0` (`0` errors, `2` warnings).

Recovery-02 validation on 2026-07-15 used a localhost-bound disposable PostgreSQL 17.10 container. The complete migration chain and single-owner HTTP flow passed, including generic credential failures, one-row owner upsert, JWT session/logout, redirect protection, protected readiness, and the admin statistics passphrase contract. TypeScript, non-interactive lint (`0` errors, the same `2` warnings), and the production build succeeded. Netlify staging was subsequently deployed and its health, protected readiness, and owner login were validated; production remains unprovisioned.

Recovery-03 validation on 2026-07-18 used localhost-bound disposable PostgreSQL 17.10 and MinIO `RELEASE.2025-09-07T16-13-09Z`. The API and real-browser checks covered direct browser/S3 upload, server-side image validation, idempotent finalize, temporary-object retry/deletion policy, explicit Timeline save, the absence of request-time public-object deletion, and two-bucket readiness without accessing Neon, Supabase, Cloudflare R2, or production. `git diff --check`, clean `npm ci`, Prisma validate/generate, TypeScript, non-interactive lint, and a fail-closed Preview-placeholder production build all exited `0`; lint and build reported only the same two existing `react-hooks/exhaustive-deps` warnings. Cloudflare staging resources and Netlify `Production`-context R2 values must be prepared before merge, and the PR-head Deploy Preview must be green. Stable readiness, upload/render, and controlled 429 smoke remain post-merge gates after the automatic merge-commit deploy.

Recovery-03A validation on 2026-07-18 used localhost-bound disposable PostgreSQL 17.10 and local HTTP/browser harnesses; no R2 upload retest or MinIO was required because storage contracts were unchanged. The matrix reproduced the old `enabled=false` mismatch, then verified empty/5/7-card saves, rejection and transaction invariance for incomplete or invalid sets, explicit legacy-row repair with `photoUrl` preservation, non-interactive incomplete/ready Builder preview, public SSR omission for disabled/not-ready Timeline data, and guarded public attempts. `git diff --check`, clean `npm ci`, Prisma validate/generate, TypeScript, non-interactive lint, and the production build exited `0`; lint and build reported only the same two existing `react-hooks/exhaustive-deps` warnings. The PR-head Deploy Preview and merge-commit staging smoke are still separate gates.

## 14. Current Project Status

As of 2026-07-18:

- Build, TypeScript, and non-interactive lint checks are green
- The Fresh-start migration chain recreates the current Prisma schema in an empty PostgreSQL 17 database without importing legacy data or creating seed records
- Neon staging PostgreSQL 17 has the validated `000`-`011` schema and no application rows at the verification point; production Neon is not provisioned
- Dashboard walkthrough is implemented
- Builder walkthrough and `...` menu are implemented
- Builder preview isolated scrolling is implemented
- Guestbook delete with confirmation is implemented
- Timeline upload uses authenticated browser-direct private uploads and server-finalized public WebP assets; its staging baseline was validated before Recovery-03A
- Timeline public visibility comes from the Sections tab, while puzzle readiness is derived from the saved 5–7-card configuration; incomplete public Timelines are omitted and incomplete Builder drafts remain previewable
- Active-tab save actions use the latest draft across dedicated save, common save, and `Ctrl/Cmd+S`; Public Guestbook has no polling loop, and API in-memory quotas are isolated by wrapped handler and HTTP method
- Environment-backed single-owner authentication replaces the removed public test-user system
- Mobile/layout polish pass is implemented across landing, builder, walkthrough, and public invitation sections
- Builder and dashboard expose sign-out actions for owner JWT sessions
- Language system is implemented with Korean as the default, a sitewide English toggle, and hydration-safe restoration of the saved language after mount
- Landing, login, dashboard, builder, walkthrough, public invitation sections, and guestbook quiz copy are localized for Korean-first UX with English fallback
- Invitation mobile behavior now includes tighter spacing, responsive gallery columns, and better small-screen cards for RSVP, guestbook, food vote, and timeline sections
- Walkthrough overlays now clamp to the viewport with internal scrolling, so guide controls stay reachable on short laptop screens and phones
- Mobile builder now uses a dedicated small-screen workflow: icon-based tab grid, simplified header actions, a sticky bottom save bar, a floating preview button that opens a separate mobile preview sheet, and arrow-button ordering controls for sections, food vote options, timeline cards, and correct-order cards

The Netlify staging application and two-bucket R2 upload baseline exist, and their health/readiness/owner/upload checks were completed before Recovery-03A. Recovery-03B performs no Dashboard configuration or deploy. Its PR-head Deploy Preview is a pre-merge gate; merging then triggers the stable staging deploy automatically, after which operators must verify latest-draft saves and the absence of an idle Guestbook request storm. Production Neon, production storage, the production domain, and public launch remain unapproved.

There is no persisted deployment state in this file. New Codex sessions should confirm the current branch, commit, and approved operational gate before acting.
