# P1a experience visibility deployment

P1a keeps `game_configs` as the generated-experience record and does not alter
or copy `user_projects`. The change is deliberately backward compatible:

- `visibility IS NULL`: legacy record; public playback remains available.
- `visibility = 'draft'`: only the owning user can load it through protected
  application APIs; the owner can still preview it through `/play/[id]`.
- `visibility = 'published'`: public playback is available.

## Manual deployment order

1. Review and apply
   `supabase/migrations/20260826_game_config_visibility.sql` through the normal
   controlled migration process.
2. Verify the new nullable `visibility` column, check constraint, and index.
3. Verify that no existing row was updated. Legacy rows must remain `NULL`.
4. Deploy the application code only after the migration succeeds.
5. Smoke-test an existing legacy/demo play URL, a new owner draft preview, an
   anonymous attempt to load that draft, and the same URL after publication.

This repository session does not apply the migration to any remote database.

## Deferred RLS hardening

The existing migration grants public `SELECT` and `INSERT` on `game_configs`.
P1a enforces visibility and ownership in application APIs but intentionally
does not replace those policies without a local Supabase policy test harness.
A later database-security deployment should test and then replace them so:

- `SELECT` permits the owner, `published`, or legacy `NULL` visibility rows;
- `INSERT` requires an authenticated user and `auth.uid() = user_id`;
- owner-only `UPDATE` and `DELETE` remain in force.

Until that RLS follow-up is deployed, clients with the public Supabase URL and
anon key can bypass application routes and read rows directly. This is a known
residual risk, not a property the application APIs rely on.
