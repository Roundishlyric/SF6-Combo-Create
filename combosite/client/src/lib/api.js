const SESSION_KEY = 'hadoukraft.api-session';

const storedSession = () => {
  try {
    const value = window.sessionStorage.getItem(SESSION_KEY) || window.localStorage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const request = async (path, options = {}) => {
  const session = storedSession();
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'The server could not complete the request.');
  return body;
};

const storeSession = ({ user, token }, remember = false) => {
  const session = { ...user, token };
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);
  const storage = remember ? window.localStorage : window.sessionStorage;
  storage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
};

export const getSession = () => storedSession();

export const registerUser = async (details) =>
  storeSession(await request('/api/auth/register', { method: 'POST', body: JSON.stringify(details) }));

export const loginUser = async ({ remember, ...credentials }) =>
  storeSession(
    await request('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    remember,
  );

export const logoutUser = async () => {
  try {
    await request('/api/auth/logout', { method: 'POST' });
  } catch {
    // A local logout should still succeed if the server session already expired.
  } finally {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  }
};

export const getCombos = async () => (await request('/api/combos')).combos;

export const uploadVideo = async (file) => {
  const session = storedSession();
  const response = await fetch('/api/videos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session?.token || ''}`,
      'Content-Type': file.type,
      'X-File-Name': encodeURIComponent(file.name),
    },
    body: file,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'The video could not be uploaded.');
  return body.video;
};

export const saveCombo = async (combo) =>
  (await request('/api/combos', { method: 'POST', body: JSON.stringify(combo) })).combo;

export const updateCombo = async (comboId, combo) =>
  (await request(`/api/combos/${comboId}`, { method: 'PUT', body: JSON.stringify(combo) })).combo;

export const deleteCombo = async (comboId) =>
  request(`/api/combos/${comboId}`, { method: 'DELETE' });

export const duplicateCombo = async (comboId) =>
  (await request(`/api/combos/${comboId}/duplicate`, { method: 'POST' })).combo;
