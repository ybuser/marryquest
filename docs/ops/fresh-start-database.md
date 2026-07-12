# Fresh-start database runbook

## Decision and scope

Fresh-start is approved for MarryQuest. The available Supabase backup did not contain the `public` application schema or application data, so User, Invitation, RSVP, Guestbook, Quiz, Timeline, MusicVote, and FoodVote records are not imported. Do not import the Supabase backup, create seed data, or create a sample invitation as part of database recovery.

Supabase Storage objects are also outside this database step. The current timeline upload code still uses Supabase Storage; replacing it is work for a later Recovery PR.

The sources of truth are:

- `prisma/schema.prisma` for the current application data model.
- `prisma/migrations/**/migration.sql` for reproducing the model in an empty PostgreSQL database.

Never edit a migration that has already been shared or applied. Add a new forward migration instead.

## Target Neon connection design

Neon is the approved target managed provider, but neither staging nor production is provisioned. No Neon connection strings have been issued or configured, and no shared Neon database has received this migration chain. The commands below are a future staging procedure to use only after provisioning and approval.

- `prisma/schema.prisma` already supports separate runtime and migration URLs.
- `DATABASE_URL` will be the pooled Neon connection used by the application runtime.
- `DIRECT_URL` will be the direct Neon connection used by Prisma migration operations.
- Once issued, both URLs must include `sslmode=require`; `connect_timeout=15` is recommended.
- Store both values in an approved secret manager. Never put credentials or connection strings in source files, documentation, commits, PR text, screenshots, or command logs.

Do not run `prisma migrate deploy` from the Netlify build. When Phase B is approved, run it as a separate, reviewed staging operation independent from the application build.

## Shared staging promotion gate

> **Shared Neon staging apply is not approved.** `npm run lint` does not currently succeed non-interactively because Next.js 14 opens its legacy ESLint configuration prompt. Do not run Phase B against shared Neon staging until a separate ESLint tooling fix has merged and every Phase A command succeeds non-interactively. The PostgreSQL 17 disposable-database migration-chain audit and approval to promote that chain to shared staging are separate gates.

## Prohibited shortcuts

- Do not use `prisma db push`. It bypasses the reviewed migration history.
- Do not edit `_prisma_migrations` manually.
- Do not use `prisma migrate resolve` for routine deployment, drift, or Fresh-start setup.
- `prisma migrate resolve` is allowed only to recover verified migration metadata after the exact database state and migration SQL have been inspected, and only with explicit approval from both a project maintainer and the database owner. Record the approval and incident separately without recording secrets.

## Future empty Neon staging prerequisites

1. Create a new, empty Neon staging project or branch. Do not point these steps at production.
2. Confirm that no MarryQuest application tables or seed records exist.
3. Configure the staging pooled URL as `DATABASE_URL` and the staging direct URL as `DIRECT_URL` through the approved secret mechanism.
4. Confirm that both variables target the same empty staging database and contain the required TLS option.
5. Never print either variable while troubleshooting.

## Windows PowerShell procedure

PowerShell is the primary future staging procedure. The commands assume the two environment variables were injected by an approved secret mechanism; do not paste their literal values into a committed script or shell history. Continue through both phases in the same PowerShell session.

### Phase A — Non-mutating preflight

This phase does not mutate the database schema; `npm ci` and Prisma generation still update local dependencies and generated artifacts. Because `npm ci` runs `prisma generate` from `postinstall`, verify both variables before running it. Run the fenced block as one complete unit. Any nonzero exit stops the procedure and prohibits Phase B. If the lint setup prompt appears, do not answer it; treat the prompt as a failed preflight and stop.

```powershell
if ([string]::IsNullOrWhiteSpace($env:DATABASE_URL)) { throw 'DATABASE_URL is required.' }
if ([string]::IsNullOrWhiteSpace($env:DIRECT_URL)) { throw 'DIRECT_URL is required.' }

function Invoke-CheckedNative {
  param([string]$Label, [scriptblock]$Command)
  & $Command
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) { throw "$Label failed with exit code $exitCode." }
}

$preflightPassed = $false
Invoke-CheckedNative 'npm ci' { npm ci }
Invoke-CheckedNative 'prisma validate' { npx prisma validate }
Invoke-CheckedNative 'prisma generate' { npx prisma generate }
Invoke-CheckedNative 'TypeScript' { npx tsc --noEmit }
Invoke-CheckedNative 'lint' { npm run lint }
Invoke-CheckedNative 'build' { npm run build }
$preflightPassed = $true
```

### Phase B — Empty staging database apply

Run this phase only after Phase A completes with six exit-code `0` results. With the current branch, lint fails before that gate opens, so shared Neon staging apply remains blocked.

```powershell
if ($preflightPassed -ne $true) { throw 'Phase A did not complete successfully; Phase B is blocked.' }

Invoke-CheckedNative 'prisma migrate deploy' { npx prisma migrate deploy }
Invoke-CheckedNative 'prisma migrate status' { npx prisma migrate status }

$diffPath = Join-Path $env:TEMP 'marryquest-staging-diff.sql'
npx prisma migrate diff `
  --from-url $env:DIRECT_URL `
  --to-schema-datamodel prisma/schema.prisma `
  --script `
  --exit-code `
  --output $diffPath

$diffCode = $LASTEXITCODE
if ($diffCode -eq 1) {
  throw 'Database-to-schema comparison failed; fix the error before proceeding.'
}
if ($diffCode -eq 2) {
  throw "Database-to-schema diff is not empty; inspect $diffPath before proceeding."
}
if ($diffCode -ne 0) { throw "Unexpected Prisma diff exit code: $diffCode" }
```

Prisma diff exit code `0` means empty, `2` means drift, and `1` means the comparison failed. Exit code `0` with no executable SQL is required before staging approval; Prisma 5 may still write the comment `-- This is an empty migration.` to the output file.

## POSIX procedure

As with PowerShell, load the two variables from an approved secret mechanism and do not place literal URLs in a script. Continue through both phases in the same shell session.

### Phase A — Non-mutating preflight

This phase does not mutate the database schema; local dependencies and generated artifacts can still change. The environment guards precede `npm ci` because its `postinstall` runs `prisma generate`. Run the fenced block as one complete unit. `set -eu` stops this phase on any failed command, and Phase B must not run unless all six commands return `0` non-interactively. If the lint setup prompt appears, do not answer it; treat the prompt as a failed preflight and stop.

```sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${DIRECT_URL:?DIRECT_URL is required}"

preflight_passed=0
npm ci
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm run lint
npm run build
preflight_passed=1
```

### Phase B — Empty staging database apply

Run this phase only after Phase A succeeds. With the current branch, the non-interactive lint gate is closed, so shared Neon staging apply remains blocked.

```sh
if [ "${preflight_passed:-0}" -ne 1 ]; then
  echo "Phase A did not complete successfully; Phase B is blocked." >&2
  exit 1
fi

npx prisma migrate deploy
npx prisma migrate status

diff_path="${TMPDIR:-/tmp}/marryquest-staging-diff.sql"
set +e
npx prisma migrate diff \
  --from-url "$DIRECT_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script \
  --exit-code \
  --output "$diff_path"
diff_code=$?
set -e

case "$diff_code" in
  0) ;;
  1)
    echo "Database-to-schema comparison failed; fix the error before proceeding." >&2
    exit 1
    ;;
  2)
    echo "Database-to-schema diff is not empty; inspect the protected diff output." >&2
    exit 2
    ;;
  *)
    echo "Unexpected Prisma diff exit code: $diff_code" >&2
    exit "$diff_code"
    ;;
esac
```

## Phase B catalog verification and staging approval

After the Phase B diff returns exit code `0`, run catalog queries through an approved database console without echoing the connection string. Phase B is not complete, and staging is not approved, until the catalog invariants pass. At minimum, record the PostgreSQL version, application tables, enums, columns, indexes, foreign keys, timestamp types, and migration state.

```sql
SELECT version();

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

SELECT t.typname AS enum_name, e.enumsortorder, e.enumlabel
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;

SELECT table_name, ordinal_position, column_name, data_type,
       is_nullable, column_default, datetime_precision
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

SELECT table_schema, table_name, column_name, column_default,
       is_nullable, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'TimelineCard'
  AND column_name IN ('title', 'shortDescription', 'photoUrl', 'order', 'correctOrder')
ORDER BY ordinal_position;

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

SELECT c.conrelid::regclass::text AS table_name, c.conname,
       c.confupdtype, c.confdeltype, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname = 'public'
  AND c.contype = 'f'
ORDER BY 1, 2;

SELECT migration_name, finished_at, rolled_back_at
FROM "_prisma_migrations"
ORDER BY started_at;
```

Required invariants include `TimelineCard.order` defaulting to `0`, `TimelineCard.shortDescription` being `NOT NULL`, `FoodVote_invitationId_voterKey_uniq` existing as a unique index, `Invitation_deletedAt_idx` existing, and every migration having a non-null `finished_at` with no `rolled_back_at` value.

## Rollback

There are no down migrations in this workflow.

- Before a shared database is changed, roll back by reverting the PR or discarding the branch.
- After applying migrations to an empty staging database, discard and recreate the staging database/project/branch, then apply the full migration chain again.
- If a non-empty approved environment must be recovered, restore a backup taken before migration. Verify the restore before resuming traffic.
- Never rewrite an existing migration to simulate rollback.
- Do not apply this Recovery step to production.
