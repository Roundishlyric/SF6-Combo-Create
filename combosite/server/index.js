import { createServer } from 'node:http';
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { closeDatabase, connectDatabase, query, transaction } from './db.js';

const scrypt = promisify(scryptCallback);
const port = Number(process.env.PORT || 3001);
const serverDirectory = dirname(fileURLToPath(import.meta.url));
const uploadsDirectory = join(serverDirectory, 'uploads');
const videoTypes = { 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov' };
const imageTypes = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const sessionTtlDays = Math.max(1, Math.min(90, Number(process.env.SESSION_TTL_DAYS) || 7));
const sessionTtlMs = sessionTtlDays * 24 * 60 * 60 * 1000;
const trustProxy = process.env.TRUST_PROXY === 'true';

const send = (response, status, body, extraHeaders = {}) => {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Expose-Headers': 'Retry-After',
    ...extraHeaders,
  });
  response.end(JSON.stringify(body));
};

const readBody = async (request) => {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error('Request body is too large.');
  }
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
};

const hashPassword = async (password, salt = randomBytes(16).toString('hex')) => {
  const hash = await scrypt(password, salt, 64);
  return { salt, hash: hash.toString('hex') };
};

const passwordMatches = async (password, user) => {
  const candidate = await scrypt(password, user.passwordSalt, 64);
  return timingSafeEqual(candidate, Buffer.from(user.passwordHash, 'hex'));
};

const publicUser = ({ id, name, email, createdAt, avatarUrl, coverUrl }) => ({ id, name, email, createdAt, avatarUrl: avatarUrl || '', coverUrl: coverUrl || '' });

const createSession = async (userId) => {
  const token = randomBytes(32).toString('hex');
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + sessionTtlMs);
  await query('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES ($1, $2, $3, $4)', [token, userId, createdAt, expiresAt]);
  return { token, expiresAt };
};

const rateLimitKey = (request, scope, discriminator = '') => {
  const forwardedAddress = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const address = (trustProxy && forwardedAddress) || request.socket.remoteAddress || 'unknown';
  return createHash('sha256').update(`${scope}|${address}|${discriminator}`).digest('hex');
};

const consumeRateLimit = async (request, scope, limit, windowMs, discriminator = '') => {
  const key = rateLimitKey(request, scope, discriminator);
  const now = new Date();
  const nextReset = new Date(now.getTime() + windowMs);
  const { rows: [entry] } = await query(`INSERT INTO rate_limits (key, count, reset_at) VALUES ($1, 1, $2)
    ON CONFLICT (key) DO UPDATE SET count = CASE WHEN rate_limits.reset_at > $3 THEN rate_limits.count + 1 ELSE 1 END,
    reset_at = CASE WHEN rate_limits.reset_at > $3 THEN rate_limits.reset_at ELSE $2 END RETURNING count, reset_at AS "resetAt"`, [key, nextReset, now]);
  return {
    blocked: entry.count > limit,
    retryAfter: Math.max(1, Math.ceil((entry.resetAt.getTime() - now.getTime()) / 1000)),
  };
};

const rejectRateLimit = (response, result) => send(
  response,
  429,
  { error: 'Too many attempts. Please try again later.' },
  { 'Retry-After': String(result.retryAfter) },
);

const authenticate = async (request) => {
  const header = request.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  const { rows: [session] } = await query(`SELECT s.user_id AS "userId", s.expires_at AS "expiresAt", u.id, u.name, u.email,
    u.password_hash AS "passwordHash", u.password_salt AS "passwordSalt", u.created_at AS "createdAt", u.avatar_url AS "avatarUrl", u.cover_url AS "coverUrl"
    FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=$1`, [token]);
  if (!session) return null;
  const expiresAt = new Date(session.expiresAt).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    await query('DELETE FROM sessions WHERE token=$1', [token]);
    return null;
  }
  return { user: session, token };
};

const validateCombo = (body) => {
  const missing = ['character', 'title', 'difficulty', 'notation'].find((field) => !String(body[field] || '').trim());
  if (missing) throw new Error(`${missing} is required.`);
  if (body.game && body.game !== 'Street Fighter 6') throw new Error('Only Street Fighter 6 is supported.');
};

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return send(response, 204, {});
  const url = new URL(request.url, `http://${request.headers.host}`);
  const path = url.pathname;

  try {
    if (request.method === 'GET' && path === '/api/health') {
      await connectDatabase();
      return send(response, 200, { status: 'ok', database: 'connected' });
    }

    const uploadMatch = path.match(/^\/uploads\/([a-f0-9-]+\.(?:mp4|webm|mov|jpg|png|webp))$/i);
    if (request.method === 'GET' && uploadMatch) {
      const filePath = join(uploadsDirectory, uploadMatch[1]);
      const file = await stat(filePath);
      const contentTypes = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
      const contentType = contentTypes[extname(filePath).toLowerCase()] || 'application/octet-stream';
      const range = request.headers.range;
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        const start = match?.[1] ? Number(match[1]) : 0;
        const end = match?.[2] ? Math.min(Number(match[2]), file.size - 1) : file.size - 1;
        if (!match || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= file.size) {
          response.writeHead(416, {
            'Content-Range': `bytes */${file.size}`,
            'Access-Control-Allow-Origin': 'http://localhost:5173',
          });
          return response.end();
        }
        response.writeHead(206, {
          'Content-Type': contentType,
          'Content-Length': end - start + 1,
          'Content-Range': `bytes ${start}-${end}/${file.size}`,
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': 'http://localhost:5173',
        });
        return createReadStream(filePath, { start, end }).pipe(response);
      }
      response.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': file.size,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': 'http://localhost:5173',
      });
      return createReadStream(filePath).pipe(response);
    }

    if (request.method === 'POST' && path === '/api/auth/register') {
      const body = await readBody(request);
      const registrationLimit = await consumeRateLimit(request, 'register', 5, 60 * 60 * 1000);
      if (registrationLimit.blocked) return rejectRateLimit(response, registrationLimit);
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!name || !email || password.length < 6) return send(response, 400, { error: 'Name, email, and a password of at least 6 characters are required.' });

      const passwordData = await hashPassword(password);
      const user = { id: randomUUID(), name, email, passwordHash: passwordData.hash, passwordSalt: passwordData.salt, createdAt: new Date().toISOString() };
      try {
        await query('INSERT INTO users (id,name,email,password_hash,password_salt,created_at) VALUES ($1,$2,$3,$4,$5,$6)', [user.id,user.name,user.email,user.passwordHash,user.passwordSalt,user.createdAt]);
      } catch (error) {
        if (error.code === '23505') return send(response, 409, { error: 'An account with this email already exists.' });
        throw error;
      }
      const session = await createSession(user.id);
      return send(response, 201, { user: publicUser(user), ...session });
    }

    if (request.method === 'POST' && path === '/api/auth/login') {
      const body = await readBody(request);
      const email = String(body.email || '').trim().toLowerCase();
      const [addressLimit, accountLimit] = await Promise.all([
        consumeRateLimit(request, 'login-address', 10, 15 * 60 * 1000),
        consumeRateLimit(request, 'login-account', 5, 15 * 60 * 1000, email),
      ]);
      if (addressLimit.blocked || accountLimit.blocked) {
        return rejectRateLimit(response, addressLimit.blocked ? addressLimit : accountLimit);
      }
      const { rows: [user] } = await query('SELECT id,name,email,password_hash AS "passwordHash",password_salt AS "passwordSalt",created_at AS "createdAt",avatar_url AS "avatarUrl",cover_url AS "coverUrl" FROM users WHERE email=$1', [email]);
      if (!user || !(await passwordMatches(String(body.password || ''), user))) return send(response, 401, { error: 'Incorrect email or password.' });
      const session = await createSession(user.id);
      return send(response, 200, { user: publicUser(user), ...session });
    }

    const auth = await authenticate(request);
    const isPublicExplore = request.method === 'GET' && path === '/api/explore';
    if (!auth && !isPublicExplore) return send(response, 401, { error: 'Authentication required.' });

    if (request.method === 'GET' && path === '/api/auth/me') return send(response, 200, { user: publicUser(auth.user) });
    if (request.method === 'POST' && path === '/api/auth/logout') {
      await query('DELETE FROM sessions WHERE token=$1', [auth.token]);
      return send(response, 200, { message: 'Logged out.' });
    }
    if (request.method === 'POST' && path === '/api/profile/image') {
      const kind = url.searchParams.get('kind');
      if (!['avatar', 'cover'].includes(kind)) return send(response, 400, { error: 'Image kind must be avatar or cover.' });
      const contentType = String(request.headers['content-type'] || '').split(';')[0];
      const extension = imageTypes[contentType];
      if (!extension) return send(response, 415, { error: 'Only JPEG, PNG, and WebP images are supported.' });
      await mkdir(uploadsDirectory, { recursive: true });
      const fileName = `${randomUUID()}${extension}`;
      const filePath = join(uploadsDirectory, fileName);
      let bytes = 0;
      const limiter = new Transform({ transform(chunk, encoding, callback) { bytes += chunk.length; callback(bytes > 8 * 1024 * 1024 ? new Error('Image must be 8 MB or smaller.') : null, chunk); } });
      try { await pipeline(request, limiter, createWriteStream(filePath, { flags: 'wx' })); }
      catch (error) { await unlink(filePath).catch(() => {}); throw error; }
      const imageUrl = `/uploads/${fileName}`;
      const column = kind === 'avatar' ? 'avatar_url' : 'cover_url';
      const { rows: [updated] } = await query(`UPDATE users SET ${column}=$1 WHERE id=$2 RETURNING id,name,email,created_at AS "createdAt",avatar_url AS "avatarUrl",cover_url AS "coverUrl"`, [imageUrl, auth.user.id]);
      return send(response, 200, { user: publicUser(updated) });
    }
    const profileMatch = path.match(/^\/api\/users\/([^/]+)\/profile$/);
    if (profileMatch && request.method === 'GET') {
      const { rows: [profile] } = await query(`SELECT u.id,u.name,u.email,u.created_at AS "createdAt",u.avatar_url AS "avatarUrl",u.cover_url AS "coverUrl",
        (SELECT count(*)::int FROM follows WHERE followed_id=u.id) AS "followers",
        (SELECT count(*)::int FROM follows WHERE follower_id=u.id) AS "following",
        EXISTS(SELECT 1 FROM follows WHERE follower_id=$1 AND followed_id=u.id) AS "followed"
        FROM users u WHERE u.id=$2`, [auth.user.id, decodeURIComponent(profileMatch[1])]);
      if (!profile) return send(response, 404, { error: 'Player not found.' });
      const ownProfile = profile.id === auth.user.id;
      const { rows } = await query(`SELECT data || jsonb_build_object('id',id,'userId',user_id,'createdAt',created_at,'updatedAt',updated_at) AS combo
        FROM combos WHERE user_id=$1 AND deleted_at IS NULL ${ownProfile ? '' : "AND data->>'status'='Published' AND data->>'visibility'='Public'"} ORDER BY updated_at DESC`, [profile.id]);
      return send(response, 200, { user: profile, combos: rows.map((row) => row.combo) });
    }
    const followMatch = path.match(/^\/api\/users\/([^/]+)\/follow$/);
    if (followMatch && request.method === 'POST') {
      const followedId = decodeURIComponent(followMatch[1]);
      if (followedId === auth.user.id) return send(response, 400, { error: 'You cannot follow yourself.' });
      const result = await transaction(async (client) => {
        const removed = await client.query('DELETE FROM follows WHERE follower_id=$1 AND followed_id=$2 RETURNING follower_id', [auth.user.id, followedId]);
        if (!removed.rowCount) await client.query('INSERT INTO follows (follower_id,followed_id,created_at) VALUES ($1,$2,now())', [auth.user.id, followedId]);
        const { rows: [{ count }] } = await client.query('SELECT count(*)::int AS count FROM follows WHERE followed_id=$1', [followedId]);
        return { followed: !removed.rowCount, followers: count };
      });
      return send(response, 200, result);
    }
    if (request.method === 'POST' && path === '/api/videos') {
      const contentType = String(request.headers['content-type'] || '').split(';')[0];
      const extension = videoTypes[contentType];
      if (!extension) return send(response, 415, { error: 'Only MP4, WebM, and MOV videos are supported.' });
      await mkdir(uploadsDirectory, { recursive: true });
      const fileName = `${randomUUID()}${extension}`;
      const filePath = join(uploadsDirectory, fileName);
      let bytes = 0;
      const limiter = new Transform({
        transform(chunk, encoding, callback) {
          bytes += chunk.length;
          callback(bytes > 100 * 1024 * 1024 ? new Error('Video must be 100 MB or smaller.') : null, chunk);
        },
      });
      try {
        await pipeline(request, limiter, createWriteStream(filePath, { flags: 'wx' }));
      } catch (error) {
        await unlink(filePath).catch(() => {});
        throw error;
      }
      return send(response, 201, { video: { url: `/uploads/${fileName}`, name: decodeURIComponent(String(request.headers['x-file-name'] || 'combo-video')), size: bytes, type: contentType } });
    }
    if (request.method === 'GET' && path === '/api/combos') {
      const { rows: combos } = await query(`SELECT data || jsonb_build_object('id',id,'userId',user_id,'createdAt',created_at,'updatedAt',updated_at) AS combo FROM combos WHERE user_id=$1 AND deleted_at IS NULL ORDER BY updated_at DESC`, [auth.user.id]);
      return send(response, 200, { combos: combos.map((row) => row.combo) });
    }
    if (request.method === 'GET' && path === '/api/explore') {
      const { rows } = await query(`SELECT c.data || jsonb_build_object('id',c.id,'userId',c.user_id,'createdAt',c.created_at,'updatedAt',c.updated_at,
        'creator',u.name,'avatarUrl',coalesce(u.avatar_url,''),'likes',count(l.user_id),'liked',coalesce(bool_or(l.user_id=$1),false)) AS combo
        FROM combos c JOIN users u ON u.id=c.user_id LEFT JOIN likes l ON l.combo_id=c.id
        WHERE c.deleted_at IS NULL AND c.data->>'status'='Published' AND c.data->>'visibility'='Public'
        GROUP BY c.id,u.name,u.avatar_url ORDER BY c.created_at DESC`, [auth?.user.id || '']);
      return send(response, 200, { combos: rows.map((row) => row.combo) });
    }
    if (request.method === 'POST' && path === '/api/combos') {
      const body = await readBody(request);
      validateCombo(body);
      const now = new Date().toISOString();
      const combo = { ...body, id: randomUUID(), userId: auth.user.id, game: 'Street Fighter 6', saves: 0, createdAt: now, updatedAt: now };
      const { id, userId, createdAt, updatedAt, ...data } = combo;
      await query('INSERT INTO combos (id,user_id,data,created_at,updated_at) VALUES ($1,$2,$3,$4,$5)', [id,userId,data,createdAt,updatedAt]);
      return send(response, 201, { combo });
    }

    const comboMatch = path.match(/^\/api\/combos\/([^/]+)$/);
    if (comboMatch && request.method === 'PUT') {
      const body = await readBody(request);
      validateCombo(body);
      const protectedFields = { ...body };
      delete protectedFields.id;
      delete protectedFields.userId;
      delete protectedFields.createdAt;
      delete protectedFields.saves;
      const updatedAt = new Date().toISOString();
      const { rows: [result] } = await query(`UPDATE combos SET data=data || $1::jsonb, updated_at=$2 WHERE id=$3 AND user_id=$4 AND deleted_at IS NULL
        RETURNING data || jsonb_build_object('id',id,'userId',user_id,'createdAt',created_at,'updatedAt',updated_at) AS combo`,
      [{ ...protectedFields, game: 'Street Fighter 6' }, updatedAt, comboMatch[1], auth.user.id]);
      return result ? send(response, 200, { combo: result.combo }) : send(response, 404, { error: 'Combo not found.' });
    }
    if (comboMatch && request.method === 'DELETE') {
      const result = await query('UPDATE combos SET deleted_at=now() WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL', [comboMatch[1], auth.user.id]);
      if (!result.rowCount) return send(response, 404, { error: 'Combo not found.' });
      return send(response, 200, { message: 'Combo deleted.' });
    }

    const likeMatch = path.match(/^\/api\/combos\/([^/]+)\/like$/);
    if (likeMatch && request.method === 'POST') {
      const { rows: [combo] } = await query(`SELECT id FROM combos WHERE id=$1 AND deleted_at IS NULL AND data->>'status'='Published' AND data->>'visibility'='Public'`, [likeMatch[1]]);
      if (!combo) return send(response, 404, { error: 'Published combo not found.' });
      const result = await transaction(async (client) => {
        const existing = await client.query('DELETE FROM likes WHERE combo_id=$1 AND user_id=$2 RETURNING user_id', [combo.id, auth.user.id]);
        if (!existing.rowCount) await client.query('INSERT INTO likes (combo_id,user_id,created_at) VALUES ($1,$2,$3)', [combo.id, auth.user.id, new Date()]);
        const { rows: [{ count }] } = await client.query('SELECT count(*)::int AS count FROM likes WHERE combo_id=$1', [combo.id]);
        await client.query(`UPDATE combos SET data=jsonb_set(data,'{saves}',$2::jsonb) WHERE id=$1`, [combo.id, JSON.stringify(count)]);
        return { liked: !existing.rowCount, likes: count };
      });
      return send(response, 200, result);
    }

    return send(response, 404, { error: 'Route not found.' });
  } catch (error) {
    console.error(error);
    return send(response, 500, { error: 'The server could not complete the request.' });
  }
});

try {
  await connectDatabase();
  server.listen(port, () => console.log(`Hadoukraft API running on http://localhost:${port} with PostgreSQL`));
} catch (error) {
  console.error(`PostgreSQL connection failed: ${error.message}`);
  process.exitCode = 1;
}

const shutdown = async () => {
  server.close();
  await closeDatabase();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
