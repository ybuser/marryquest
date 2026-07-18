# Fresh-start database runbook

## Decision and scope

Fresh-start is approved for MarryQuest. The available Supabase backup did not contain the `public` application schema or application data, so User, Invitation, RSVP, Guestbook, Quiz, Timeline, MusicVote, and FoodVote records are not imported. Do not import the Supabase backup, create seed data, or create a sample invitation as part of database recovery.

Supabase Storage objects are also outside this database step and are not imported. Timeline upload code now targets a separate R2 two-bucket flow; provisioning or validating storage remains independent from every database migration gate.

The sources of truth are:

- `prisma/schema.prisma` for the current application data model.
- `prisma/migrations/**/migration.sql` for reproducing the model in an empty PostgreSQL database.

Never edit a migration that has already been shared or applied. Add a new forward migration instead.

## Neon connection state and design

The approved Neon PostgreSQL 17 staging database has received migrations `000` through `011`. The release audit verified migration names/order/checksums, the expected catalog, an empty database-to-schema diff, pooled/direct connectivity, and zero application rows at the verification point. Keep that staging project; do not rerun this runbook against it during routine application work. Production Neon is not provisioned, and the staging result is not production approval.

The commands below remain the controlled procedure for a newly approved empty staging replacement/branch or another future environment-specific promotion. They are not authorization to mutate the existing staging database.

- `prisma/schema.prisma` already supports separate runtime and migration URLs.
- `DATABASE_URL` is the pooled Neon connection used by the application runtime.
- `DIRECT_URL` is the direct Neon connection used by Prisma migration operations.
- Both URLs must include `sslmode=require`; `connect_timeout=15` is recommended.
- Store both values in an approved secret manager. Never put credentials or connection strings in source files, documentation, commits, PR text, screenshots, or command logs.

Do not run `prisma migrate deploy` from the Netlify build. When Phase B is approved, run it as a separate, reviewed staging operation independent from the application build.

## Shared staging promotion gate

> **The original Neon staging promotion completed for migrations `000` through `011`; it is not a standing approval for another apply.** Before any future Phase B operation, rerun every Phase A command against the exact selected commit and require each command to succeed. Passing Phase A does not authorize Phase B: every new staging replacement, branch, or migration requires separate explicit operational approval. Disposable-database auditing and shared-environment promotion remain separate gates.

## Prohibited shortcuts

- Do not use `prisma db push`. It bypasses the reviewed migration history.
- Do not edit `_prisma_migrations` manually.
- Do not use `prisma migrate resolve` for routine deployment, drift, or Fresh-start setup.
- `prisma migrate resolve` is allowed only to recover verified migration metadata after the exact database state and migration SQL have been inspected, and only with explicit approval from both a project maintainer and the database owner. Record the approval and incident separately without recording secrets.

## Future empty Neon staging replacement or promotion prerequisites

1. Obtain explicit operational approval to provision a new, empty Neon staging project or branch, then create it. Do not point these steps at production.
2. Confirm that no MarryQuest application tables or seed records exist.
3. Configure the staging pooled URL as `DATABASE_URL` and the staging direct URL as `DIRECT_URL` through the approved secret mechanism.
4. Confirm that both variables target the same empty staging database and contain the required TLS option.
5. Never print either variable while troubleshooting.

## Windows PowerShell procedure

PowerShell is the primary future empty-environment procedure. The commands assume the two environment variables were injected by an approved secret mechanism; do not paste their literal values into a committed script or shell history. Continue through both phases in the same PowerShell session.

### Phase A — Non-mutating preflight

This phase does not mutate the database schema; `npm ci` and Prisma generation still update local dependencies and generated artifacts. Because `npm ci` runs `prisma generate` from `postinstall`, verify both variables before running it. Run the fenced block as one complete unit. Any nonzero exit stops the procedure and prohibits Phase B. If any command prompts for input, treat it as a failed non-interactive preflight and stop.

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

Run this phase only after all six Phase A commands return `0` non-interactively against the exact commit selected for staging and explicit operational approval for the staging migration is recorded. Phase A success alone does not authorize Phase B.

```powershell
if ($preflightPassed -ne $true) { throw 'Phase A did not complete successfully; Phase B is blocked.' }

Invoke-CheckedNative 'prisma migrate deploy' { npx prisma migrate deploy }
Invoke-CheckedNative 'prisma migrate status' { npx prisma migrate status }

$prismaCli = (Resolve-Path '.\node_modules\prisma\build\index.js').Path
$diffStartInfo = [System.Diagnostics.ProcessStartInfo]::new()
$diffStartInfo.FileName = (Get-Command node).Source
$diffStartInfo.Arguments = "`"$prismaCli`" migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script --exit-code"
$diffStartInfo.UseShellExecute = $false
$diffStartInfo.RedirectStandardOutput = $true
$diffStartInfo.RedirectStandardError = $true
$diffStartInfo.EnvironmentVariables['DATABASE_URL'] = $env:DIRECT_URL

$diffProcess = [System.Diagnostics.Process]::new()
$diffProcess.StartInfo = $diffStartInfo
[void]$diffProcess.Start()
$diffOutputTask = $diffProcess.StandardOutput.ReadToEndAsync()
$diffErrorTask = $diffProcess.StandardError.ReadToEndAsync()
if (-not $diffProcess.WaitForExit(120000)) {
  try { $diffProcess.Kill() } catch {}
  throw 'Database-to-schema comparison timed out after 120 seconds.'
}
$diffOutput = $diffOutputTask.GetAwaiter().GetResult()
$diffError = $diffErrorTask.GetAwaiter().GetResult()
$diffCode = $diffProcess.ExitCode
if ($diffCode -eq 1) {
  throw 'Database-to-schema comparison failed; redact the captured $diffError value before reviewing it.'
}
if ($diffCode -eq 2) {
  throw 'Database-to-schema diff is not empty; review the captured $diffOutput SQL without executing it.'
}
if ($diffCode -ne 0) { throw "Unexpected Prisma diff exit code: $diffCode" }

$executableSql = @($diffOutput -split "`r?`n" | Where-Object {
  $line = $_.Trim()
  $line.Length -gt 0 -and -not $line.StartsWith('--')
})
if ($executableSql.Count -ne 0) { throw 'Diff exited 0 but emitted executable SQL.' }
$diffOutput = $null
$diffError = $null
```

The schema-datasource mode above gives only the child Prisma process the direct URL and keeps it out of the argument list. The staging D1 audit also proved canonical `--from-url` mode with the direct local CLI and no output file; the cause of an earlier output-file comparison error was not isolated. Prisma diff exit code `0` means empty, `2` means drift, and `1` means the comparison failed. Exit code `0` with no executable SQL is required before staging approval; Prisma 5 may still emit the comment `-- This is an empty migration.`. Never print captured diagnostics before redacting connection identifiers.

## POSIX procedure

As with PowerShell, load the two variables from an approved secret mechanism and do not place literal URLs in a script. Continue through both phases in the same shell session.

### Phase A — Non-mutating preflight

This phase does not mutate the database schema; local dependencies and generated artifacts can still change. The environment guards precede `npm ci` because its `postinstall` runs `prisma generate`. Run the fenced block as one complete unit. `set -eu` stops this phase on any failed command, and Phase B must not run unless all six commands return `0` non-interactively. If any command prompts for input, treat it as a failed non-interactive preflight and stop.

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

Run this phase only after all six Phase A commands return `0` non-interactively against the exact commit selected for staging and explicit operational approval for the staging migration is recorded. Phase A success alone does not authorize Phase B.

```sh
if [ "${preflight_passed:-0}" -ne 1 ]; then
  echo "Phase A did not complete successfully; Phase B is blocked." >&2
  exit 1
fi

npx prisma migrate deploy
npx prisma migrate status

diff_capture_dir=$(mktemp -d "${TMPDIR:-/tmp}/marryquest-diff.XXXXXX")
chmod 700 "$diff_capture_dir"
diff_stdout="$diff_capture_dir/stdout"
diff_stderr="$diff_capture_dir/stderr"
cleanup_diff_capture() { rm -rf -- "$diff_capture_dir"; }
trap cleanup_diff_capture EXIT HUP INT TERM

set +e
DATABASE_URL="$DIRECT_URL" node node_modules/prisma/build/index.js migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script \
  --exit-code >"$diff_stdout" 2>"$diff_stderr"
diff_code=$?
set -e

case "$diff_code" in
  0) ;;
  1)
    trap - EXIT HUP INT TERM
    echo "Database-to-schema comparison failed. Redact diagnostics under $diff_capture_dir before review, then delete that directory." >&2
    exit 1
    ;;
  2)
    rm -f -- "$diff_stderr"
    trap - EXIT HUP INT TERM
    echo "Database-to-schema diff is not empty. Review $diff_stdout without executing it, then delete $diff_capture_dir." >&2
    exit 2
    ;;
  *)
    echo "Unexpected Prisma diff exit code: $diff_code" >&2
    exit "$diff_code"
    ;;
esac

executable_sql=$(sed '/^[[:space:]]*$/d; /^[[:space:]]*--/d' "$diff_stdout")
if [ -n "$executable_sql" ]; then
  trap - EXIT HUP INT TERM
  echo "Diff exited 0 but emitted executable SQL. Review $diff_stdout without executing it, then delete $diff_capture_dir." >&2
  exit 1
fi
unset executable_sql
cleanup_diff_capture
trap - EXIT HUP INT TERM
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
