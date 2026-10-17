# P1a.5 staging-only `game_configs` RLS runbook

Confirmed staging project:

- Dashboard name: `BioQuestXR Staging`
- Project ref: `iyzobsooosytapgankoi`

The repository's existing Supabase link is unknown. Never run `supabase link`,
`supabase db push --linked`, or `supabase migration up --linked` from this
checkout.

## Migration audit and bootstrap scope

This is a minimal `game_configs` bootstrap for P1a testing, not a complete
BioQuest database bootstrap.

| Existing SQL | Classification | Reason / action |
| --- | --- | --- |
| `supabase/migrations/create_game_configs.sql` | Needs normalization | Required baseline, but its filename is not versioned, trigger/policy creation is not rerunnable, names are not schema-qualified, and it intentionally grants anonymous read/insert. Use the staging normalized baseline instead. |
| `supabase/migrations/20260826_game_config_visibility.sql` | Safe after baseline | Additive, preserves existing rows as `NULL`, and adds only a constraint/index/comment. Copy it into the isolated bundle with a 14-digit version. |
| `supabase/migrations/20250206_user_projects.sql` | Conditionally safe, excluded | Depends only on Supabase Auth, but policy creation is not rerunnable and it omits the `short_id` used by application code. It is not required for P1a RLS tests. |
| `supabase_user_projects_table.sql` | Conflicting manual script, excluded | Overlaps the versioned migration with different columns, indexes, policy names, and trigger function. Do not mix it into automated history. |
| `supabase/migrations/20250207_ngss_assets.sql` | Conditionally safe, excluded | Standalone asset catalog, but policy creation is not rerunnable. Not required for P1a. |
| `supabase/migrations/20250204_stripe_subscriptions.sql` | Unsafe on empty staging, excluded | Assumes `public.profiles` already exists. Stripe/billing is out of scope. |
| `clean_test_projects.sql` | Destructive utility, excluded | Contains optional delete operations and is not a schema migration. |

Known missing full-application dependencies include migrations for `profiles`,
`scenes`, `cancellation_reasons`, required storage buckets/policies, and the
canonical `user_projects.short_id` shape. Do not infer or create them during
P1a.5.

## Reproducible order from empty staging to P1a.5

1. `20250205000000_game_configs_baseline.sql` — normalized legacy baseline.
2. `20260826000000_game_config_visibility.sql` — exact P1a visibility SQL.
3. `20260829000000_game_configs_rls.sql` — owner/public RLS hardening.
4. `game_configs_rls_test.sql` — rollback-only policy test, not a migration.

## Credentials and target guard

Load the staging database URL into `P1A5_STAGING_DB_URL` using your normal
local secret manager. Do not paste it into shell history, commit it, or print
it. The URL must contain the confirmed staging ref.

```bash
cd /Users/deadpool/Desktop/XRbioquest

export P1A5_STAGING_REF='iyzobsooosytapgankoi'
: "${P1A5_STAGING_DB_URL:?Load the staging DB URL from your secret manager}"

case "$P1A5_STAGING_DB_URL" in
  *"$P1A5_STAGING_REF"*) ;;
  *) echo 'STOP: DB URL is not the confirmed BioQuestXR Staging project'; exit 1 ;;
esac

P1A5_BUNDLE="$(mktemp -d)"
supabase init --workdir "$P1A5_BUNDLE"
```

Do not use `--linked` in any command below.

## Stage 1: baseline

```bash
cp \
  supabase/staging/bootstrap/20250205000000_game_configs_baseline.sql \
  "$P1A5_BUNDLE/supabase/migrations/20250205000000_game_configs_baseline.sql"

supabase db push \
  --workdir "$P1A5_BUNDLE" \
  --db-url "$P1A5_STAGING_DB_URL" \
  --include-all \
  --dry-run
```

**STOP 1:** the dry run must name exactly the baseline migration. Reconfirm the
Dashboard project name and ref before removing `--dry-run`:

```bash
supabase db push \
  --workdir "$P1A5_BUNDLE" \
  --db-url "$P1A5_STAGING_DB_URL" \
  --include-all
```

**STOP 2:** inspect `public.game_configs` in the staging Dashboard. Confirm the
columns through `updated_at`, RLS enabled, zero rows, and the four temporary
legacy policies. Do not create application data yet.

## Stage 2: P1a visibility

```bash
cp \
  supabase/migrations/20260826_game_config_visibility.sql \
  "$P1A5_BUNDLE/supabase/migrations/20260826000000_game_config_visibility.sql"

supabase db push \
  --workdir "$P1A5_BUNDLE" \
  --db-url "$P1A5_STAGING_DB_URL" \
  --include-all \
  --dry-run
```

**STOP 3:** the dry run must list only the visibility migration. Then apply it:

```bash
supabase db push \
  --workdir "$P1A5_BUNDLE" \
  --db-url "$P1A5_STAGING_DB_URL" \
  --include-all
```

**STOP 4:** confirm nullable `visibility`, its check constraint, the visibility
index, zero rows, and no other schema changes.

## Stage 3: staging RLS hardening

```bash
cp \
  supabase/staging/migrations/20260829000000_game_configs_rls.sql \
  "$P1A5_BUNDLE/supabase/migrations/20260829000000_game_configs_rls.sql"

supabase db push \
  --workdir "$P1A5_BUNDLE" \
  --db-url "$P1A5_STAGING_DB_URL" \
  --include-all \
  --dry-run
```

**STOP 5:** the dry run must list only the RLS migration. Inspect its policy
drops, five policy creates, grants, and anon write revocation. Then apply it:

```bash
supabase db push \
  --workdir "$P1A5_BUNDLE" \
  --db-url "$P1A5_STAGING_DB_URL" \
  --include-all

supabase migration list \
  --workdir "$P1A5_BUNDLE" \
  --db-url "$P1A5_STAGING_DB_URL"
```

**STOP 6:** migration history must contain the three bundle versions exactly
once. In the Dashboard, confirm only these policies exist on `game_configs`:

- `game_configs_public_read`
- `game_configs_owner_read`
- `game_configs_owner_insert`
- `game_configs_owner_update`
- `game_configs_owner_delete`

## Policy tests

Create two disposable users in the **BioQuestXR Staging** Auth dashboard. Put
their UUIDs—not passwords or tokens—into shell variables. `psql` is required;
it is not currently installed in this development environment.

```bash
export P1A5_OWNER_ID='first-staging-auth-user-uuid'
export P1A5_NON_OWNER_ID='second-staging-auth-user-uuid'

psql "$P1A5_STAGING_DB_URL" \
  -X \
  -v ON_ERROR_STOP=1 \
  -v owner_id="$P1A5_OWNER_ID" \
  -v non_owner_id="$P1A5_NON_OWNER_ID" \
  -f supabase/staging/tests/game_configs_rls_test.sql
```

**STOP 7:** require the final message `P1a.5 game_configs RLS tests passed;
transaction rolled back.` Confirm that no `p1a5-rls-*` rows remain.

## Rollback

Preferred rollback for the empty staging project is to pause application
testing and apply the staging rollback file, which restores only the legacy
policies and leaves schema/data intact:

```bash
psql "$P1A5_STAGING_DB_URL" \
  -X \
  -v ON_ERROR_STOP=1 \
  -f supabase/staging/rollback/20260829000000_game_configs_rls_rollback.sql
```

Then inspect policies before continuing. This rollback deliberately reopens
anonymous reads/inserts and must never be treated as the desired final state.
It also leaves the RLS migration recorded as applied; use a new forward-fix
migration or recreate the disposable staging project before retrying. Do not
rewrite migration history merely to rerun the same file.

For a fully disposable empty staging project, the safer clean-slate rollback
is to delete/recreate that staging project rather than manually rewriting
migration history. Never run `supabase db reset`, destructive SQL, or migration
history repair against the unknown linked project.
