# MarryQuest Dev Instructions

Last updated: 2026-07-12

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
- Target managed provider: Neon; staging and production are not provisioned yet
- Supabase Storage for timeline card images
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
- `/api/upload/timeline-card`

## 4. Auth Model

Authentication is currently test-user based. There is no signup flow.

- `lib/auth.ts` uses a NextAuth Credentials provider.
- Credentials are `loginId` and `password`.
- Successful login upserts a Prisma `User` by stable email.
- Protected pages and APIs use `requirePageAuth` and `requireApiAuth`.

The test account source is `lib/testUsers.ts`.

Current test accounts:

| Login ID | Password |
| --- | --- |
| `guest1` | `wedding1` |
| `guest2` | `wedding2` |
| `guest3` | `wedding3` |
| `guest4` | `wedding4` |
| `guest5` | `wedding5` |
| `guest6` | `wedding6` |
| `guest7` | `wedding7` |
| `guest8` | `wedding8` |
| `guest9` | `wedding9` |
| `guest10` | `wedding10` |

Important distinction:

- The normal app login uses test accounts.
- `/api/admin/invitations/[id]/stats` still uses `x-admin-passphrase` against `ADMIN_PASSPHRASE`. That route is separate from the main login flow.

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
- Timeline builder uploads images through the server and stores optimized square WebP files

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

Target Neon connection design:

- `prisma/schema.prisma` already supports separate `DATABASE_URL` and `DIRECT_URL` values.
- In a provisioned Neon environment, `DATABASE_URL` will be the pooled application runtime connection and `DIRECT_URL` will be the direct connection for Prisma migration commands.
- Neon staging and production are not provisioned, no Neon connection strings have been issued or configured, and no shared Neon database has received this migration chain.
- Once issued, both connections require TLS; include `sslmode=require`, with `connect_timeout=15` recommended.
- Do not run migrations in the Netlify build. After the preflight gate passes, apply them as a separate, reviewed staging operation.
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
- Quiz badge token signing uses `QUIZ_BADGE_SECRET` or falls back to `NEXTAUTH_SECRET`

## 10. Image and Storage Notes

Timeline image upload is implemented in:

- `pages/api/upload/timeline-card.ts`

Current behavior:

- Upload requires auth
- Accepts jpeg/png/webp
- Max upload size is 10 MB
- Server converts to square `640x640` WebP with `sharp`
- Upload path is under the timeline bucket
- Public URL is returned from Supabase Storage

Security and rendering support:

- `next.config.js` allows Supabase image hosts in CSP
- `next.config.js` also allows Supabase Storage in Next image remote patterns

Current limitation:

- Gallery photos render from DB URLs
- There is no dedicated gallery upload flow in the current builder codebase
- Supabase Storage remains in the current timeline upload code and is planned for replacement in a later Recovery PR; it has not been migrated to R2 in this recovery step.

## 11. Environment Variables

Required for normal local app usage:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_SECRET`

The Prisma datasource supports `DATABASE_URL` for application runtime access and `DIRECT_URL` for migration access. In the target Neon environment, these will be pooled and direct connections respectively; no shared Neon values have been issued or configured yet.

Required if using timeline uploads:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:

- `SUPABASE_STORAGE_BUCKET` default is `timeline`
- `QUIZ_BADGE_SECRET` falls back to `NEXTAUTH_SECRET`
- `ADMIN_PASSPHRASE` only for the admin stats API
- `SKIP_PRISMA_GENERATION`

Use quoted values in `.env` for safety, especially for URLs and secrets.

## 12. Key Files

High-signal files for future sessions:

- `lib/auth.ts`
- `lib/testUsers.ts`
- `pages/login.tsx`
- `pages/dashboard/index.tsx`
- `pages/builder/[id].tsx`
- `components/i18n/LanguageProvider.tsx`
- `components/i18n/LanguageToggle.tsx`
- `components/walkthrough/GuidedWalkthrough.tsx`
- `components/invitation/InvitationPage.tsx`
- `components/invitation/sections/MapButtons.tsx`
- `components/invitation/sections/TimelineSection.tsx`
- `pages/api/upload/timeline-card.ts`
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

Fresh-start validation on 2026-07-12 used disposable PostgreSQL 17.10. Migrations `000` through `011`, Prisma validation/generation/status, typecheck, and the production build succeeded; the final database-to-schema diff was empty. Next.js 14 ESLint tooling was validated on 2026-07-12 with the root `.eslintrc.json` extending `next/core-web-vitals`; `npm run lint` executed lint rules non-interactively and exited with code `0` (`0` errors, `2` warnings).

## 14. Current Project Status

As of 2026-07-12:

- Build, TypeScript, and non-interactive lint checks are green
- The Fresh-start migration chain recreates the current Prisma schema in an empty PostgreSQL 17 database without importing legacy data or creating seed records
- The Prisma datasource supports separate runtime and migration URLs; Neon remains the target provider, with staging/production provisioning and shared migration still outstanding
- Dashboard walkthrough is implemented
- Builder walkthrough and `...` menu are implemented
- Builder preview isolated scrolling is implemented
- Guestbook delete with confirmation is implemented
- Timeline image processing and display fixes are implemented
- Test-user login system is implemented
- Mobile/layout polish pass is implemented across landing, builder, walkthrough, and public invitation sections
- Builder and dashboard now expose sign-out actions for test-user sessions
- Language system is implemented with Korean as the default, a sitewide English toggle, and hydration-safe restoration of the saved language after mount
- Landing, login, dashboard, builder, walkthrough, public invitation sections, and guestbook quiz copy are localized for Korean-first UX with English fallback
- Invitation mobile behavior now includes tighter spacing, responsive gallery columns, and better small-screen cards for RSVP, guestbook, food vote, and timeline sections
- Walkthrough overlays now clamp to the viewport with internal scrolling, so guide controls stay reachable on short laptop screens and phones
- Mobile builder now uses a dedicated small-screen workflow: icon-based tab grid, simplified header actions, a sticky bottom save bar, a floating preview button that opens a separate mobile preview sheet, and arrow-button ordering controls for sections, food vote options, timeline cards, and correct-order cards

There is no active in-progress feature branch state recorded in this file. New Codex sessions should start from the current codebase and this document.
