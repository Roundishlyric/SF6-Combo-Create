import { useEffect, useRef, useState } from 'react';
import { deleteNotification, getNotifications, markNotificationRead, markNotificationsRead } from '../lib/api.js';

const messageFor = (item) => {
  if (item.type === 'combo_posted') return `Your combo “${item.data?.title || 'Untitled'}” was posted.`;
  if (item.type === 'combo_liked') return `${item.actorName || 'A player'} liked “${item.data?.title || 'your combo'}”.`;
  if (item.type === 'followed') return `${item.actorName || 'A player'} followed you.`;
  return 'You have a new notification.';
};

const relativeTime = (value) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
};

export default function Notifications({ navigate }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    let active = true;
    const load = () => getNotifications().then((result) => { if (active) { setItems(result.notifications); setUnread(result.unread); } }).catch(() => {});
    load();
    const timer = window.setInterval(load, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const close = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const toggle = () => setOpen((current) => !current);

  const markAllRead = async () => {
    const readAt = new Date().toISOString();
    setUnread(0);
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || readAt })));
    await markNotificationsRead().catch(() => {});
  };

  const visit = async (item) => {
    if (!item.readAt) {
      setUnread((current) => Math.max(0, current - 1));
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
      await markNotificationRead(item.id).catch(() => {});
    }
    setOpen(false);
    if (item.type === 'followed' && item.actorId) navigate(`/profile/${item.actorId}`);
    else if (item.comboId) navigate(`/combos/${encodeURIComponent(item.comboId)}`);
  };

  const remove = async (event, item) => {
    event.stopPropagation();
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    if (!item.readAt) setUnread((current) => Math.max(0, current - 1));
    await deleteNotification(item.id).catch(() => {});
  };

  return <div className="notifications" ref={root}>
    <button className="icon-button notification-button" type="button" aria-label={`${unread} unread notifications`} aria-expanded={open} onClick={toggle}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </svg>
      {unread > 0 && <b>{unread > 9 ? '9+' : unread}</b>}
    </button>
    {open && <section className="notification-panel" aria-label="Notifications">
      <div className="notification-heading"><strong>Notifications</strong>{unread ? <button type="button" onClick={markAllRead}>Mark all read</button> : <span>Up to date</span>}</div>
      <div className="notification-list">{items.length ? items.map((item) => <article className={!item.readAt ? 'unread' : ''} key={item.id}><button className="notification-content" type="button" onClick={() => visit(item)}><span className="notification-avatar">{item.actorAvatarUrl ? <img src={item.actorAvatarUrl} alt="" /> : (item.actorName || 'HK').charAt(0).toUpperCase()}</span><span><strong>{messageFor(item)}</strong><small>{relativeTime(item.createdAt)}</small></span></button><button className="notification-delete" type="button" onClick={(event) => remove(event, item)} aria-label={`Delete notification: ${messageFor(item)}`}>×</button></article>) : <p>No notifications yet.</p>}</div>
    </section>}
  </div>;
}
