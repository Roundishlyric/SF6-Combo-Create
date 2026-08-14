import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { before, after, test } from 'node:test';
import pg from 'pg';

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationTest = databaseUrl ? test : test.skip;
let baseUrl;
let server;
let database;

const api = async (path, { cookie, body, headers = {}, method = body ? 'POST' : 'GET' } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { response, body: await response.json().catch(() => ({})) };
};

before(async () => {
  if (!databaseUrl) return;
  process.env.DATABASE_URL = databaseUrl;
  process.env.VERCEL = '1';
  process.env.TRUST_PROXY = 'true';
  await import('../scripts/migrate.js');
  database = new pg.Client({ connectionString: databaseUrl });
  await database.connect();
  await database.query('TRUNCATE notifications, follows, likes, combos, sessions, rate_limits, users CASCADE');
  const { default: handler } = await import('../server/index.js');
  server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (database) await database.end();
});

integrationTest('registration, login cookie, and authorization', async () => {
  const credentials = { name: 'Ryu Player', email: 'ryu@example.test', password: 'Shoryuken6' };
  assert.equal((await api('/api/auth/register', { body: credentials })).response.status, 201);
  const login = await api('/api/auth/login', { body: { email: credentials.email, password: credentials.password, remember: true } });
  assert.equal(login.response.status, 200);
  assert.equal('token' in login.body, false);
  const cookie = login.response.headers.get('set-cookie');
  assert.match(cookie, /hadoukraft_session=.*HttpOnly.*SameSite=Lax.*Secure/i);
  assert.equal((await api('/api/combos')).response.status, 401);
  assert.equal((await api('/api/auth/me', { cookie })).response.status, 200);
});

integrationTest('combo ownership prevents another user from editing', async () => {
  const combo = { character: 'Ryu', title: 'Corner punish', difficulty: 'Easy', notation: '5HP 236HP', damage: '2100', status: 'Published', visibility: 'Public' };
  const firstLogin = await api('/api/auth/login', { body: { email: 'ryu@example.test', password: 'Shoryuken6' } });
  const firstCookie = firstLogin.response.headers.get('set-cookie');
  const created = await api('/api/combos', { cookie: firstCookie, body: combo });
  assert.equal(created.response.status, 201);
  await api('/api/auth/register', { body: { name: 'Ken Player', email: 'ken@example.test', password: 'Hadouken123' } });
  const secondLogin = await api('/api/auth/login', { body: { email: 'ken@example.test', password: 'Hadouken123' } });
  const secondCookie = secondLogin.response.headers.get('set-cookie');
  assert.equal((await api(`/api/combos/${created.body.combo.id}`, { cookie: secondCookie, method: 'PUT', body: { ...combo, title: 'Stolen edit' } })).response.status, 404);
  assert.equal((await api(`/api/combos/${created.body.combo.id}`, { cookie: secondCookie, method: 'DELETE' })).response.status, 404);
});

integrationTest('upload routes require authentication', async () => {
  const result = await api('/api/uploads/token', { body: {} });
  assert.notEqual(result.response.status, 200);
});

integrationTest('login rate limiting returns 429', async () => {
  let status;
  for (let attempt = 0; attempt < 7; attempt += 1) {
    ({ response: { status } } = await api('/api/auth/login', {
      headers: { 'X-Forwarded-For': '198.51.100.20' },
      body: { email: 'limited@example.test', password: 'WrongPassword1' },
    }));
  }
  assert.equal(status, 429);
});
