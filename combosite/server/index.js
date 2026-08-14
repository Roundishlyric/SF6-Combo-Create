import { createServer } from 'node:http';
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { handleUpload } from '@vercel/blob/client';
import { closeDatabase, connectDatabase, query, transaction } from './db.js';

const scrypt = promisify(scryptCallback);
const port = Number(process.env.PORT || 3001);
const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const sessionTtlDays = Math.max(1, Math.min(90, Number(process.env.SESSION_TTL_DAYS) || 7));
const sessionTtlMs = sessionTtlDays * 24 * 60 * 60 * 1000;
const trustProxy = process.env.TRUST_PROXY === 'true';
const sessionCookieName = 'hadoukraft_session';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const send = (response, status, body, extraHeaders = {}) => {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  response.end(JSON.stringify(body));
};

const readBody = async (request) => {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new RequestError('Request body is too large.', 413);
  }
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    throw new RequestError('Request body must be valid JSON.');
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

const sessionCookie = (token, remember = false) => [
  `${sessionCookieName}=${encodeURIComponent(token)}`,
  'Path=/',
  'HttpOnly',
  'SameSite=Lax',
  ...(process.env.VERCEL ? ['Secure'] : []),
  ...(remember ? [`Max-Age=${Math.floor(sessionTtlMs / 1000)}`] : []),
].join('; ');

const clearSessionCookie = () => `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.VERCEL ? '; Secure' : ''}`;

const cookieValue = (request, name) => String(request.headers.cookie || '')
  .split(';')
  .map((part) => part.trim().split('='))
  .find(([key]) => key === name)?.slice(1).join('=');

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
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : decodeURIComponent(cookieValue(request, sessionCookieName) || '');
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
  const character = String(body.character || '').trim();
  const title = String(body.title || '').trim();
  const difficulty = String(body.difficulty || '').trim();
  const notation = String(body.notation || '').trim();
  const damage = String(body.damage || '').trim();
  if (!character) throw new RequestError('Character is required.');
  if (title.length < 3 || title.length > 80) throw new RequestError('Title must be between 3 and 80 characters.');
  if (!difficulty) throw new RequestError('Difficulty is required.');
  if (notation.length < 2 || notation.length > 500) throw new RequestError('Notation must be between 2 and 500 characters.');
  if (!/^\d+$/.test(damage) || Number(damage) < 1 || Number(damage) > 999999) throw new RequestError('Damage must be a positive whole number up to 999999.');
  if (body.game && body.game !== 'Street Fighter 6') throw new RequestError('Only Street Fighter 6 is supported.');
};

const handler = async (request, response) => {
  const requestId = String(request.headers['x-vercel-id'] || randomUUID());
  response.setHeader('X-Request-Id', requestId);
  if (request.method === 'OPTIONS') return send(response, 204, {});
  const url = new URL(request.url, `http://${request.headers.host}`);
  const path = url.pathname;

  try {
    if (request.method === 'GET' && path === '/api/health') {
      await connectDatabase();
      return send(response, 200, { status: 'ok', database: 'connected' });
    }

    if (request.method === 'GET' && path === '/api/maintenance') {
      const expected = process.env.CRON_SECRET;
      const supplied = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (!expected || supplied !== expected) return send(response, 401, { error: 'Authentication required.' });
      const [sessions, rateLimits] = await Promise.all([
        query('DELETE FROM sessions WHERE expires_at <= now()'),
        query('DELETE FROM rate_limits WHERE reset_at <= now()'),
      ]);
      return send(response, 200, { status: 'ok', deleted: { sessions: sessions.rowCount, rateLimits: rateLimits.rowCount } });
    }

    if (request.method === 'POST' && path === '/api/auth/register') {
      const body = await readBody(request);
      const registrationLimit = await consumeRateLimit(request, 'register', 5, 60 * 60 * 1000);
      if (registrationLimit.blocked) return rejectRateLimit(response, registrationLimit);
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (name.length < 2 || name.length > 60) return send(response, 400, { error: 'Name must be between 2 and 60 characters.' });
      if (email.length > 254 || !emailPattern.test(email)) return send(response, 400, { error: 'Enter a valid email address.' });
      if (password.length < 8 || password.length > 128 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
        return send(response, 400, { error: 'Password must be at least 8 characters and include uppercase, lowercase, and a number.' });
      }

      const passwordData = await hashPassword(password);
      const user = { id: randomUUID(), name, email, passwordHash: passwordData.hash, passwordSalt: passwordData.salt, createdAt: new Date().toISOString() };
      try {
        await query('INSERT INTO users (id,name,email,password_hash,password_salt,created_at) VALUES ($1,$2,$3,$4,$5,$6)', [user.id,user.name,user.email,user.passwordHash,user.passwordSalt,user.createdAt]);
      } catch (error) {
        if (error.code === '23505') return send(response, 409, { error: 'An account with this email already exists.' });
        throw error;
      }
      return send(response, 201, { user: publicUser(user) });
    }

    if (request.method === 'POST' && path === '/api/auth/login') {
      const body = await readBody(request);
      const email = String(body.email || '').trim().toLowerCase();
      if (email.length > 254 || !emailPattern.test(email) || !String(body.password || '')) return send(response, 400, { error: 'Enter a valid email and password.' });
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
      return send(response, 200, { user: publicUser(user), expiresAt: session.expiresAt }, {
        'Set-Cookie': sessionCookie(session.token, body.remember === true),
      });
    }

    if (request.method === 'POST' && path === '/api/uploads/token') {
      const body = await readBody(request);
      const uploadResponse = await handleUpload({
        request,
        body,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          const auth = await authenticate(request);
          if (!auth) throw new RequestError('Authentication required.', 401);
          const payload = JSON.parse(clientPayload || '{}');
          const isProfileImage = payload.type === 'profile' && ['avatar', 'cover'].includes(payload.kind);
          const isVideo = payload.type === 'video';
          if (!isProfileImage && !isVideo) throw new RequestError('Invalid upload request.');
          if (isProfileImage && !pathname.startsWith(`profiles/${auth.user.id}/`)) throw new RequestError('Invalid profile upload path.');
          if (isVideo && !pathname.startsWith(`videos/${auth.user.id}/`)) throw new RequestError('Invalid video upload path.');
          return {
            allowedContentTypes: isProfileImage ? imageTypes : videoTypes,
            maximumSizeInBytes: isProfileImage ? 8 * 1024 * 1024 : 100 * 1024 * 1024,
            addRandomSuffix: true,
            tokenPayload: JSON.stringify({ userId: auth.user.id, ...payload }),
          };
        },
        onUploadCompleted: async () => {},
      });
      return send(response, 200, uploadResponse);
    }

    const auth = await authenticate(request);
    const isPublicExplore = request.method === 'GET' && path === '/api/explore';
    if (!auth && !isPublicExplore) return send(response, 401, { error: 'Authentication required.' });

    if (request.method === 'GET' && path === '/api/auth/me') return send(response, 200, { user: publicUser(auth.user) });
    if (request.method === 'POST' && path === '/api/auth/logout') {
      await query('DELETE FROM sessions WHERE token=$1', [auth.token]);
      return send(response, 200, { message: 'Logged out.' }, { 'Set-Cookie': clearSessionCookie() });
    }
    if (request.method === 'GET' && path === '/api/notifications') {
      const { rows } = await query(`SELECT n.id,n.type,n.combo_id AS "comboId",n.data,n.created_at AS "createdAt",n.read_at AS "readAt",
        a.id AS "actorId",a.name AS "actorName",a.avatar_url AS "actorAvatarUrl"
        FROM notifications n LEFT JOIN users a ON a.id=n.actor_id WHERE n.user_id=$1 ORDER BY n.created_at DESC LIMIT 40`, [auth.user.id]);
      return send(response, 200, { notifications: rows, unread: rows.filter((item) => !item.readAt).length });
    }
    if (request.method === 'POST' && path === '/api/notifications/read') {
      await query('UPDATE notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL', [auth.user.id]);
      return send(response, 200, { message: 'Notifications marked as read.' });
    }
    const notificationReadMatch = path.match(/^\/api\/notifications\/([^/]+)\/read$/);
    if (notificationReadMatch && request.method === 'POST') {
      const { rows: [notification] } = await query('UPDATE notifications SET read_at=coalesce(read_at,now()) WHERE id=$1 AND user_id=$2 RETURNING id,read_at AS "readAt"', [decodeURIComponent(notificationReadMatch[1]), auth.user.id]);
      return notification ? send(response, 200, { notification }) : send(response, 404, { error: 'Notification not found.' });
    }
    const notificationMatch = path.match(/^\/api\/notifications\/([^/]+)$/);
    if (notificationMatch && request.method === 'DELETE') {
      const result = await query('DELETE FROM notifications WHERE id=$1 AND user_id=$2', [decodeURIComponent(notificationMatch[1]), auth.user.id]);
      return result.rowCount ? send(response, 200, { message: 'Notification deleted.' }) : send(response, 404, { error: 'Notification not found.' });
    }
    if (request.method === 'POST' && path === '/api/profile/image') {
      const kind = url.searchParams.get('kind');
      if (!['avatar', 'cover'].includes(kind)) return send(response, 400, { error: 'Image kind must be avatar or cover.' });
      const body = await readBody(request);
      let imageUrl;
      try {
        const parsedUrl = new URL(body.url);
        if (parsedUrl.protocol !== 'https:' || !parsedUrl.hostname.endsWith('.blob.vercel-storage.com')) throw new Error();
        imageUrl = parsedUrl.toString();
      } catch {
        return send(response, 400, { error: 'A valid Vercel Blob URL is required.' });
      }
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
      let likedCombos = [];
      if (ownProfile) {
        const { rows: likedRows } = await query(`SELECT c.data || jsonb_build_object('id',c.id,'userId',c.user_id,'createdAt',c.created_at,'updatedAt',c.updated_at,
          'creator',u.name,'avatarUrl',coalesce(u.avatar_url,''),'liked',true,'likes',(SELECT count(*)::int FROM likes WHERE combo_id=c.id)) AS combo
          FROM likes l JOIN combos c ON c.id=l.combo_id JOIN users u ON u.id=c.user_id
          WHERE l.user_id=$1 AND c.deleted_at IS NULL AND c.data->>'status'='Published' AND c.data->>'visibility'='Public'
          ORDER BY l.created_at DESC`, [profile.id]);
        likedCombos = likedRows.map((row) => row.combo);
      }
      return send(response, 200, { user: profile, combos: rows.map((row) => row.combo), likedCombos });
    }
    const followMatch = path.match(/^\/api\/users\/([^/]+)\/follow$/);
    if (followMatch && request.method === 'POST') {
      const followedId = decodeURIComponent(followMatch[1]);
      if (followedId === auth.user.id) return send(response, 400, { error: 'You cannot follow yourself.' });
      const result = await transaction(async (client) => {
        const removed = await client.query('DELETE FROM follows WHERE follower_id=$1 AND followed_id=$2 RETURNING follower_id', [auth.user.id, followedId]);
        if (!removed.rowCount) {
          await client.query('INSERT INTO follows (follower_id,followed_id,created_at) VALUES ($1,$2,now())', [auth.user.id, followedId]);
          await client.query(`INSERT INTO notifications (id,user_id,actor_id,type,data,created_at) VALUES ($1,$2,$3,'followed','{}'::jsonb,now())`, [randomUUID(), followedId, auth.user.id]);
        }
        const { rows: [{ count }] } = await client.query('SELECT count(*)::int AS count FROM follows WHERE followed_id=$1', [followedId]);
        return { followed: !removed.rowCount, followers: count };
      });
      return send(response, 200, result);
    }
    if (request.method === 'POST' && path === '/api/videos') {
      return send(response, 410, { error: 'Upload videos through the Vercel Blob client endpoint.' });
    }
    if (request.method === 'GET' && path === '/api/combos') {
      const { rows: combos } = await query(`SELECT data || jsonb_build_object('id',id,'userId',user_id,'createdAt',created_at,'updatedAt',updated_at) AS combo FROM combos WHERE user_id=$1 AND deleted_at IS NULL ORDER BY updated_at DESC`, [auth.user.id]);
      return send(response, 200, { combos: combos.map((row) => row.combo) });
    }
    if (request.method === 'GET' && path === '/api/explore') {
      const { rows } = await query(`SELECT c.data || jsonb_build_object('id',c.id,'userId',c.user_id,'createdAt',c.created_at,'updatedAt',c.updated_at,
        'creator',u.name,'avatarUrl',coalesce(u.avatar_url,''),'likes',count(l.user_id),'liked',coalesce(bool_or(l.user_id=$1),false),
        'followed',EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=$1 AND f.followed_id=c.user_id)) AS combo
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
      await query(`INSERT INTO notifications (id,user_id,actor_id,combo_id,type,data,created_at) VALUES ($1,$2,$2,$3,'combo_posted',$4,now())`, [randomUUID(), userId, id, { title: combo.title }]);
      return send(response, 201, { combo });
    }

    const comboMatch = path.match(/^\/api\/combos\/([^/]+)$/);
    if (comboMatch && request.method === 'GET') {
      const { rows: [result] } = await query(`SELECT c.data || jsonb_build_object('id',c.id,'userId',c.user_id,'createdAt',c.created_at,'updatedAt',c.updated_at,
        'creator',u.name,'avatarUrl',coalesce(u.avatar_url,''),'likes',(SELECT count(*)::int FROM likes WHERE combo_id=c.id),
        'liked',EXISTS(SELECT 1 FROM likes WHERE combo_id=c.id AND user_id=$1)) AS combo
        FROM combos c JOIN users u ON u.id=c.user_id WHERE c.id=$2 AND c.deleted_at IS NULL
        AND (c.user_id=$1 OR (c.data->>'status'='Published' AND c.data->>'visibility'='Public'))`, [auth.user.id, decodeURIComponent(comboMatch[1])]);
      return result ? send(response, 200, { combo: result.combo }) : send(response, 404, { error: 'Combo not found.' });
    }
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
      const { rows: [combo] } = await query(`SELECT id,user_id,data->>'title' AS title FROM combos WHERE id=$1 AND deleted_at IS NULL AND data->>'status'='Published' AND data->>'visibility'='Public'`, [likeMatch[1]]);
      if (!combo) return send(response, 404, { error: 'Published combo not found.' });
      const result = await transaction(async (client) => {
        const existing = await client.query('DELETE FROM likes WHERE combo_id=$1 AND user_id=$2 RETURNING user_id', [combo.id, auth.user.id]);
        if (!existing.rowCount) {
          await client.query('INSERT INTO likes (combo_id,user_id,created_at) VALUES ($1,$2,$3)', [combo.id, auth.user.id, new Date()]);
          if (combo.user_id !== auth.user.id) await client.query(`INSERT INTO notifications (id,user_id,actor_id,combo_id,type,data,created_at) VALUES ($1,$2,$3,$4,'combo_liked',$5,now())`, [randomUUID(), combo.user_id, auth.user.id, combo.id, { title: combo.title }]);
        }
        const { rows: [{ count }] } = await client.query('SELECT count(*)::int AS count FROM likes WHERE combo_id=$1', [combo.id]);
        await client.query(`UPDATE combos SET data=jsonb_set(data,'{saves}',$2::jsonb) WHERE id=$1`, [combo.id, JSON.stringify(count)]);
        return { liked: !existing.rowCount, likes: count };
      });
      return send(response, 200, result);
    }

    return send(response, 404, { error: 'Route not found.' });
  } catch (error) {
    console.error({ requestId, method: request.method, path, error });
    return send(response, error.status || 500, { error: error.status ? error.message : 'The server could not complete the request.' });
  }
};

export default handler;

const server = createServer(handler);

if (!process.env.VERCEL) {
  try {
    await connectDatabase();
    server.listen(port, () => console.log(`Hadoukraft API running on http://localhost:${port} with PostgreSQL`));
  } catch (error) {
    console.error(`PostgreSQL connection failed: ${error.message}`);
    process.exitCode = 1;
  }
}

const shutdown = async () => {
  server.close();
  await closeDatabase();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
