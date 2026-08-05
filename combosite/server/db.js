import pg from 'pg';

const { Pool } = pg;
let pool;

const schema = `
CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE, password_hash text NOT NULL, password_salt text NOT NULL, created_at timestamptz NOT NULL);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url text;
CREATE TABLE IF NOT EXISTS sessions (token text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL, expires_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS combos (id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, data jsonb NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, deleted_at timestamptz);
ALTER TABLE combos ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS combos_user_updated_idx ON combos(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS combos_public_idx ON combos(created_at DESC) WHERE data->>'status' = 'Published' AND data->>'visibility' = 'Public';
CREATE INDEX IF NOT EXISTS combos_user_active_updated_idx ON combos(user_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS combos_public_active_idx ON combos(created_at DESC) WHERE deleted_at IS NULL AND data->>'status' = 'Published' AND data->>'visibility' = 'Public';
CREATE TABLE IF NOT EXISTS likes (user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, combo_id text NOT NULL REFERENCES combos(id) ON DELETE CASCADE, created_at timestamptz NOT NULL, PRIMARY KEY (user_id, combo_id));
CREATE INDEX IF NOT EXISTS likes_combo_id_idx ON likes(combo_id);
CREATE TABLE IF NOT EXISTS follows (follower_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, followed_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL, PRIMARY KEY (follower_id, followed_id), CHECK (follower_id <> followed_id));
CREATE INDEX IF NOT EXISTS follows_followed_id_idx ON follows(followed_id);
CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, count integer NOT NULL, reset_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS rate_limits_reset_at_idx ON rate_limits(reset_at);
`;

export async function connectDatabase() {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing. Add your PostgreSQL connection string to .env.');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query(schema);
  await pool.query("DELETE FROM sessions WHERE expires_at <= now(); DELETE FROM rate_limits WHERE reset_at <= now(); UPDATE combos SET data = data - 'views' WHERE data ? 'views'");
  return pool;
}

export async function query(text, values = []) { return (await connectDatabase()).query(text, values); }

export async function transaction(work) {
  const client = await (await connectDatabase()).connect();
  try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function closeDatabase() { if (pool) await pool.end(); pool = undefined; }
