import { createServer } from 'node:http';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { closeDatabase, collections, connectDatabase } from './db.js';

const scrypt = promisify(scryptCallback);
const port = Number(process.env.PORT || 3001);
const serverDirectory = dirname(fileURLToPath(import.meta.url));
const uploadsDirectory = join(serverDirectory, 'uploads');
const videoTypes = { 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov' };

const send = (response, status, body) => {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

const publicUser = ({ id, name, email, createdAt }) => ({ id, name, email, createdAt });

const authenticate = async (request) => {
  const header = request.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  const { sessions, users } = await collections();
  const session = await sessions.findOne({ token });
  if (!session) return null;
  const user = await users.findOne({ id: session.userId });
  return user ? { user, token } : null;
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

    const uploadMatch = path.match(/^\/uploads\/([a-f0-9-]+\.(?:mp4|webm|mov))$/i);
    if (request.method === 'GET' && uploadMatch) {
      const filePath = join(uploadsDirectory, uploadMatch[1]);
      const file = await stat(filePath);
      const contentTypes = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' };
      response.writeHead(200, {
        'Content-Type': contentTypes[extname(filePath).toLowerCase()] || 'application/octet-stream',
        'Content-Length': file.size,
        'Access-Control-Allow-Origin': 'http://localhost:5173',
      });
      return createReadStream(filePath).pipe(response);
    }

    if (request.method === 'POST' && path === '/api/auth/register') {
      const body = await readBody(request);
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!name || !email || password.length < 6) return send(response, 400, { error: 'Name, email, and a password of at least 6 characters are required.' });

      const { users, sessions } = await collections();
      const passwordData = await hashPassword(password);
      const user = { id: randomUUID(), name, email, passwordHash: passwordData.hash, passwordSalt: passwordData.salt, createdAt: new Date().toISOString() };
      const token = randomBytes(32).toString('hex');
      try {
        await users.insertOne(user);
      } catch (error) {
        if (error.code === 11000) return send(response, 409, { error: 'An account with this email already exists.' });
        throw error;
      }
      await sessions.insertOne({ token, userId: user.id, createdAt: new Date().toISOString() });
      return send(response, 201, { user: publicUser(user), token });
    }

    if (request.method === 'POST' && path === '/api/auth/login') {
      const body = await readBody(request);
      const { users, sessions } = await collections();
      const user = await users.findOne({ email: String(body.email || '').trim().toLowerCase() });
      if (!user || !(await passwordMatches(String(body.password || ''), user))) return send(response, 401, { error: 'Incorrect email or password.' });
      const token = randomBytes(32).toString('hex');
      await sessions.insertOne({ token, userId: user.id, createdAt: new Date().toISOString() });
      return send(response, 200, { user: publicUser(user), token });
    }

    const auth = await authenticate(request);
    if (!auth) return send(response, 401, { error: 'Authentication required.' });
    const database = await collections();

    if (request.method === 'GET' && path === '/api/auth/me') return send(response, 200, { user: publicUser(auth.user) });
    if (request.method === 'POST' && path === '/api/auth/logout') {
      await database.sessions.deleteOne({ token: auth.token });
      return send(response, 200, { message: 'Logged out.' });
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
      const combos = await database.combos.find({ userId: auth.user.id }, { projection: { _id: 0 } }).sort({ updatedAt: -1 }).toArray();
      return send(response, 200, { combos });
    }
    if (request.method === 'GET' && path === '/api/explore') {
      const combos = await database.combos
        .find({ status: 'Published', visibility: 'Public' }, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .toArray();
      const userIds = [...new Set(combos.map((combo) => combo.userId))];
      const comboIds = combos.map((combo) => combo.id);
      const [creators, likeCounts, userLikes] = await Promise.all([
        database.users.find({ id: { $in: userIds } }, { projection: { _id: 0, id: 1, name: 1 } }).toArray(),
        database.likes.aggregate([
          { $match: { comboId: { $in: comboIds } } },
          { $group: { _id: '$comboId', count: { $sum: 1 } } },
        ]).toArray(),
        database.likes.find(
          { userId: auth.user.id, comboId: { $in: comboIds } },
          { projection: { _id: 0, comboId: 1 } },
        ).toArray(),
      ]);
      const creatorNames = new Map(creators.map((creator) => [creator.id, creator.name]));
      const counts = new Map(likeCounts.map((entry) => [entry._id, entry.count]));
      const likedIds = new Set(userLikes.map((entry) => entry.comboId));
      return send(response, 200, {
        combos: combos.map((combo) => ({
          ...combo,
          creator: creatorNames.get(combo.userId) || 'Unknown player',
          likes: counts.get(combo.id) || 0,
          liked: likedIds.has(combo.id),
        })),
      });
    }
    if (request.method === 'POST' && path === '/api/combos') {
      const body = await readBody(request);
      validateCombo(body);
      const now = new Date().toISOString();
      const combo = { ...body, id: randomUUID(), userId: auth.user.id, game: 'Street Fighter 6', views: 0, saves: 0, createdAt: now, updatedAt: now };
      await database.combos.insertOne(combo);
      delete combo._id;
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
      delete protectedFields.views;
      delete protectedFields.saves;
      const result = await database.combos.findOneAndUpdate(
        { id: comboMatch[1], userId: auth.user.id },
        { $set: { ...protectedFields, game: 'Street Fighter 6', updatedAt: new Date().toISOString() } },
        { returnDocument: 'after', projection: { _id: 0 } },
      );
      return result ? send(response, 200, { combo: result }) : send(response, 404, { error: 'Combo not found.' });
    }
    if (comboMatch && request.method === 'DELETE') {
      const result = await database.combos.deleteOne({ id: comboMatch[1], userId: auth.user.id });
      if (!result.deletedCount) return send(response, 404, { error: 'Combo not found.' });
      await database.likes.deleteMany({ comboId: comboMatch[1] });
      return send(response, 200, { message: 'Combo deleted.' });
    }

    const likeMatch = path.match(/^\/api\/combos\/([^/]+)\/like$/);
    if (likeMatch && request.method === 'POST') {
      const combo = await database.combos.findOne({
        id: likeMatch[1],
        status: 'Published',
        visibility: 'Public',
      });
      if (!combo) return send(response, 404, { error: 'Published combo not found.' });
      const existing = await database.likes.findOne({ comboId: combo.id, userId: auth.user.id });
      if (existing) {
        await database.likes.deleteOne({ comboId: combo.id, userId: auth.user.id });
      } else {
        await database.likes.insertOne({
          comboId: combo.id,
          userId: auth.user.id,
          createdAt: new Date().toISOString(),
        });
      }
      const likes = await database.likes.countDocuments({ comboId: combo.id });
      await database.combos.updateOne({ id: combo.id }, { $set: { saves: likes } });
      return send(response, 200, { liked: !existing, likes });
    }

    const duplicateMatch = path.match(/^\/api\/combos\/([^/]+)\/duplicate$/);
    if (duplicateMatch && request.method === 'POST') {
      const source = await database.combos.findOne({ id: duplicateMatch[1], userId: auth.user.id }, { projection: { _id: 0 } });
      if (!source) return send(response, 404, { error: 'Combo not found.' });
      const now = new Date().toISOString();
      const copy = { ...source, id: randomUUID(), title: `${source.title} (Copy)`, status: 'Draft', views: 0, saves: 0, createdAt: now, updatedAt: now };
      await database.combos.insertOne(copy);
      delete copy._id;
      return send(response, 201, { combo: copy });
    }

    return send(response, 404, { error: 'Route not found.' });
  } catch (error) {
    console.error(error);
    return send(response, 500, { error: 'The server could not complete the request.' });
  }
});

try {
  await connectDatabase();
  server.listen(port, () => console.log(`Hadoukraft API running on http://localhost:${port} with MongoDB`));
} catch (error) {
  console.error(`MongoDB connection failed: ${error.message}`);
  process.exitCode = 1;
}

const shutdown = async () => {
  server.close();
  await closeDatabase();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
