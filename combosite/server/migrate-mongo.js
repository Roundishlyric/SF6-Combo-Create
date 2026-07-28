import { MongoClient } from 'mongodb';
import { closeDatabase, connectDatabase } from './db.js';

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required as the migration source.');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required as the PostgreSQL destination.');

const mongo = new MongoClient(process.env.MONGODB_URI);
const date = (value, fallback = new Date()) => {
  const parsed = new Date(value || fallback);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

try {
  await mongo.connect();
  const source = mongo.db(process.env.MONGODB_DB || 'hadoukraft');
  const postgres = await connectDatabase();
  const client = await postgres.connect();
  const counts = {};
  try {
    await client.query('BEGIN');
    const users = await source.collection('users').find({}).toArray();
    for (const user of users) await client.query(`INSERT INTO users (id,name,email,password_hash,password_salt,created_at) VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (id) DO UPDATE SET name=excluded.name,email=excluded.email,password_hash=excluded.password_hash,password_salt=excluded.password_salt,created_at=excluded.created_at`,
    [user.id,user.name,user.email,user.passwordHash,user.passwordSalt,date(user.createdAt)]);
    counts.users = users.length;

    const combos = await source.collection('combos').find({}).toArray();
    for (const combo of combos) {
      const { _id, id, userId, createdAt, updatedAt, ...data } = combo;
      await client.query(`INSERT INTO combos (id,user_id,data,created_at,updated_at) VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (id) DO UPDATE SET user_id=excluded.user_id,data=excluded.data,created_at=excluded.created_at,updated_at=excluded.updated_at`,
      [id,userId,data,date(createdAt),date(updatedAt, date(createdAt))]);
    }
    counts.combos = combos.length;

    const sessions = await source.collection('sessions').find({ expiresAt: { $gt: new Date() } }).toArray();
    for (const session of sessions) await client.query(`INSERT INTO sessions (token,user_id,created_at,expires_at) VALUES ($1,$2,$3,$4)
      ON CONFLICT (token) DO UPDATE SET user_id=excluded.user_id,created_at=excluded.created_at,expires_at=excluded.expires_at`,
    [session.token,session.userId,date(session.createdAt),date(session.expiresAt)]);
    counts.sessions = sessions.length;

    const likes = await source.collection('likes').find({}).toArray();
    for (const like of likes) await client.query(`INSERT INTO likes (user_id,combo_id,created_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [like.userId,like.comboId,date(like.createdAt)]);
    counts.likes = likes.length;

    const limits = await source.collection('rateLimits').find({ resetAt: { $gt: new Date() } }).toArray();
    for (const limit of limits) await client.query(`INSERT INTO rate_limits (key,count,reset_at) VALUES ($1,$2,$3)
      ON CONFLICT (key) DO UPDATE SET count=excluded.count,reset_at=excluded.reset_at`, [limit.key,limit.count,date(limit.resetAt)]);
    counts.rateLimits = limits.length;
    await client.query('COMMIT');
    console.log('Migration completed:', counts);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
} finally {
  await mongo.close();
  await closeDatabase();
}
