-- ─── game_configs ────────────────────────────────────────────────────────────
-- Stores AI-generated GameConfig JSON blobs for the /play runtime.
-- id is a UUID (client-generated) used directly as the /play/[id] URL segment.

CREATE TABLE IF NOT EXISTS game_configs (
  id             TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  config         JSONB       NOT NULL,
  title          TEXT,
  subject        TEXT,
  prompt         TEXT,
  is_published   BOOLEAN     DEFAULT false,
  play_count     INTEGER     DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS game_configs_user_id_idx ON game_configs (user_id);
CREATE INDEX IF NOT EXISTS game_configs_created_at_idx ON game_configs (created_at DESC);

-- ─── updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON game_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Row-Level Security ───────────────────────────────────────────────────────
-- Auth gating is deferred — anon users can read + insert for now.
-- Tighten these policies when auth is required.

ALTER TABLE game_configs ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can read any config
CREATE POLICY "public_read_game_configs"
  ON game_configs
  FOR SELECT
  USING (true);

-- Anyone can insert (no-login creation flow)
CREATE POLICY "public_insert_game_configs"
  ON game_configs
  FOR INSERT
  WITH CHECK (true);

-- Authenticated users can update/delete only their own configs
CREATE POLICY "owner_update_game_configs"
  ON game_configs
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "owner_delete_game_configs"
  ON game_configs
  FOR DELETE
  USING (auth.uid() = user_id);
