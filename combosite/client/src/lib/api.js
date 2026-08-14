import { upload } from '@vercel/blob/client';

const SESSION_KEY = 'hadoukraft.api-session';

const storedSession = () => {
  try {
    const value = window.sessionStorage.getItem(SESSION_KEY) || window.localStorage.getItem(SESSION_KEY);
    const session = value ? JSON.parse(value) : null;
    if (session && (!session.expiresAt || new Date(session.expiresAt).getTime() <= Date.now())) {
      window.localStorage.removeItem(SESSION_KEY);
      window.sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
};

const request = async (path, options = {}) => {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'The server could not complete the request.');
  return body;
};

const storeSession = ({ user, expiresAt }, remember = false) => {
  const session = { ...user, expiresAt };
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);
  const storage = remember ? window.localStorage : window.sessionStorage;
  storage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
};

export const getSession = () => storedSession();

export const updateSessionUser = (user) => {
  const current = storedSession();
  if (!current) return null;
  const updated = { ...current, ...user };
  const storage = window.localStorage.getItem(SESSION_KEY) ? window.localStorage : window.sessionStorage;
  storage.setItem(SESSION_KEY, JSON.stringify(updated));
  return updated;
};

export const registerUser = async (details) =>
  request('/api/auth/register', { method: 'POST', body: JSON.stringify(details) });

export const loginUser = async ({ remember, ...credentials }) =>
  storeSession(
    await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ ...credentials, remember }) }),
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
export const getProfile = async (userId) => request(`/api/users/${encodeURIComponent(userId)}/profile`);
export const toggleFollow = async (userId) => request(`/api/users/${encodeURIComponent(userId)}/follow`, { method: 'POST' });

export const getExploreCombos = async () => (await request('/api/explore')).combos;
export const getCombo = async (comboId) => (await request(`/api/combos/${encodeURIComponent(comboId)}`)).combo;
export const getNotifications = async () => request('/api/notifications');
export const markNotificationsRead = async () => request('/api/notifications/read', { method: 'POST' });
export const markNotificationRead = async (notificationId) => request(`/api/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'POST' });
export const deleteNotification = async (notificationId) => request(`/api/notifications/${encodeURIComponent(notificationId)}`, { method: 'DELETE' });

export const toggleComboLike = async (comboId) =>
  request(`/api/combos/${comboId}/like`, { method: 'POST' });

export const uploadVideo = async (file) => {
  const session = storedSession();
  if (!session?.id) throw new Error('Authentication required.');
  const blob = await upload(`videos/${session.id}/${crypto.randomUUID()}-${file.name}`, file, {
    access: 'public',
    handleUploadUrl: '/api/uploads/token',
    clientPayload: JSON.stringify({ type: 'video' }),
    multipart: file.size > 5 * 1024 * 1024,
  });
  return { url: blob.url, name: file.name, size: file.size, type: file.type };
};

export const uploadProfileImage = async (kind, file) => {
  const session = storedSession();
  if (!session?.id) throw new Error('Authentication required.');
  const blob = await upload(`profiles/${session.id}/${kind}-${crypto.randomUUID()}-${file.name}`, file, {
    access: 'public',
    handleUploadUrl: '/api/uploads/token',
    clientPayload: JSON.stringify({ type: 'profile', kind }),
    multipart: file.size > 4 * 1024 * 1024,
  });
  const response = await fetch(`/api/profile/image?kind=${encodeURIComponent(kind)}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: blob.url }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'The image could not be updated.');
  return body.user;
};

export const saveCombo = async (combo) =>
  (await request('/api/combos', { method: 'POST', body: JSON.stringify(combo) })).combo;

export const updateCombo = async (comboId, combo) =>
  (await request(`/api/combos/${comboId}`, { method: 'PUT', body: JSON.stringify(combo) })).combo;

export const deleteCombo = async (comboId) =>
  request(`/api/combos/${comboId}`, { method: 'DELETE' });
