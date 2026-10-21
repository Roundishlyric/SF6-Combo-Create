CREATE TABLE IF NOT EXISTS comments (
  id text PRIMARY KEY,
  combo_id text NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_combo_created_idx ON comments(combo_id, created_at DESC, id DESC);
