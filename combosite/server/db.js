import pg from 'pg';

const { Pool } = pg;
let pool;

export async function connectDatabase() {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing. Add your PostgreSQL connection string to .env.');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Math.max(1, Number(process.env.DATABASE_POOL_MAX) || (process.env.VERCEL ? 3 : 10)),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
    ...(process.env.DATABASE_SSL === 'true' ? { ssl: { rejectUnauthorized: true } } : {}),
  });
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
