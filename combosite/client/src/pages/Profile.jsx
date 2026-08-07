import { useEffect, useMemo, useState } from 'react';
import '../styles/Home.css';
import '../styles/Profile.css';
import { getProfile, toggleFollow, uploadProfileImage } from '../lib/api.js';
import { getCharacterImage } from '../lib/characterImages.js';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import Notifications from '../components/Notifications.jsx';

const fighterColor = (fighter) => {
  if (['Ken', 'Marisa', 'Dhalsim'].includes(fighter)) return 'orange';
  if (['Juri', 'A.K.I.', 'M. Bison'].includes(fighter)) return 'purple';
  if (['Luke', 'Chun-Li', 'Guile'].includes(fighter)) return 'blue';
  return 'red';
};

function Profile({ navigate, user, profileId, onLogout, onUserUpdate }) {
  const [combos, setCombos] = useState([]);
  const [likedCombos, setLikedCombos] = useState([]);
  const [comboTab, setComboTab] = useState('created');
  const [profileUser, setProfileUser] = useState(user);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showLogout, setShowLogout] = useState(false);
  const [uploading, setUploading] = useState('');
  const [snackbar, setSnackbar] = useState(null);
  const recentCombos = useMemo(
    () => [...combos].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 3),
    [combos],
  );

  useEffect(() => {
    let active = true;
    getProfile(profileId)
      .then((result) => { if (active) { setProfileUser(result.user); setCombos(result.combos); setLikedCombos(result.likedCombos || []); setComboTab('created'); } })
      .catch((problem) => { if (active) setLoadError(problem.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profileId]);
  const isOwnProfile = profileUser.id === user.id;
  const displayedCombos = comboTab === 'liked' ? likedCombos : recentCombos;

  const totalLikes = combos.reduce((sum, combo) => sum + Number(combo.saves || 0), 0);
  useEffect(() => {
    if (!showLogout) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setShowLogout(false); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [showLogout]);

  useEffect(() => {
    if (!snackbar) return undefined;
    const timer = window.setTimeout(() => setSnackbar(null), 3200);
    return () => window.clearTimeout(timer);
  }, [snackbar]);

  const changeImage = async (kind, file) => {
    if (!file) return;
    setUploading(kind);
    try {
      const updated = await uploadProfileImage(kind, file);
      onUserUpdate(updated);
      setProfileUser((current) => ({ ...current, ...updated }));
      setSnackbar({ type: 'success', message: `${kind === 'avatar' ? 'Profile picture' : 'Cover photo'} updated successfully.` });
    } catch (problem) {
      setSnackbar({ type: 'error', message: problem.message });
    } finally { setUploading(''); }
  };
  const follow = async () => {
    try {
      const result = await toggleFollow(profileUser.id);
      setProfileUser((current) => ({ ...current, ...result }));
      setSnackbar({ type: 'success', message: result.followed ? `You are now following ${profileUser.name}.` : `You unfollowed ${profileUser.name}.` });
    } catch (problem) { setSnackbar({ type: 'error', message: problem.message }); }
  };

  const go = (event, path) => {
    event.preventDefault();
    navigate(path);
  };

  return (
    <div className="home-page profile-page">
      <header className="home-header">
        <a className="home-brand" href="/home" onClick={(event) => go(event, '/home')}>
          <span className="brand-mark">HK</span>
          <span>Hadou<span>Kraft</span></span>
        </a>
        <nav className="home-nav" aria-label="Main navigation">
          <a href="/home" onClick={(event) => go(event, '/home')}>Home</a>
          <a href="/create" onClick={(event) => go(event, '/create')}>Create Combo</a>
          <a href="/combos" onClick={(event) => go(event, '/combos')}>Explore</a>
          <a href="/my-combos" onClick={(event) => go(event, '/my-combos')}>My Combos</a>
        </nav>
        <div className="home-user">
          <Notifications navigate={navigate} />
          <button className="avatar active-avatar" type="button" aria-label="Profile">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.name.charAt(0).toUpperCase()}</button>
        </div>
      </header>

      <main className="profile-main">
        <section className="profile-hero">
          <div className="profile-cover" style={profileUser.coverUrl ? { backgroundImage: `linear-gradient(rgba(8,8,12,.2), rgba(8,8,12,.42)), url(${profileUser.coverUrl})` } : undefined}>
            <span className="cover-grid" />
            {isOwnProfile && <label className="change-cover" aria-label="Change cover photo"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => changeImage('cover', event.target.files?.[0])} disabled={Boolean(uploading)} /><span>{uploading === 'cover' ? '…' : '✎'}</span></label>}
          </div>
          <div className="profile-identity">
            <div className="profile-portrait">
              {profileUser.avatarUrl ? <img src={profileUser.avatarUrl} alt={`${profileUser.name}'s profile`} /> : <span>{profileUser.name.charAt(0).toUpperCase()}</span>}<i />
              {isOwnProfile && <label className="change-avatar" aria-label="Change profile picture"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => changeImage('avatar', event.target.files?.[0])} disabled={Boolean(uploading)} /><span>{uploading === 'avatar' ? '…' : '✎'}</span></label>}
            </div>
            <div className="identity-copy">
              <div className="name-row"><h1>{profileUser.name}</h1></div>
              <p className="player-handle">{profileUser.email}</p>
            </div>
            <div className="profile-actions">
              {isOwnProfile ? <button className="logout-button" type="button" onClick={() => setShowLogout(true)}><span aria-hidden="true">↪</span> Log out</button>
                : <button className={`follow-button ${profileUser.followed ? 'following' : ''}`} type="button" onClick={follow}>{profileUser.followed ? 'Following' : '+ Follow'}</button>}
            </div>
          </div>
          <div className="profile-numbers" aria-label="Player statistics">
            <div><strong>{combos.length}</strong><span>Combos</span></div>
            <div><strong>{totalLikes}</strong><span>Likes received</span></div>
            <div><strong>{profileUser.followers || 0}</strong><span>Followers</span></div>
            <div><strong>{profileUser.following || 0}</strong><span>Following</span></div>
          </div>
        </section>

        <div className="profile-layout">
          <section className="profile-content">
            <div className="profile-section-title">
              <div>
                <p className="eyebrow">THE LAB</p>
                <div className="profile-tabs" role="tablist" aria-label="Profile combos">
                  <button className={comboTab === 'created' ? 'active' : ''} type="button" role="tab" aria-selected={comboTab === 'created'} onClick={() => setComboTab('created')}>Recent combos <span>{combos.length}</span></button>
                  {isOwnProfile && <button className={comboTab === 'liked' ? 'active' : ''} type="button" role="tab" aria-selected={comboTab === 'liked'} onClick={() => setComboTab('liked')}>Liked combos <span>{likedCombos.length}</span></button>}
                </div>
              </div>
              {isOwnProfile && <button className="profile-create-link" type="button" onClick={() => navigate('/create')}>Create combo <span>＋</span></button>}
            </div>
            {loadError && <p className="profile-message error" role="alert">{loadError}</p>}
            {loading && <SkeletonLoader variant="row" count={3} />}
            <div className="profile-combo-list">
              {!loading && displayedCombos.map((combo) => (
                <article className="profile-combo" key={combo.id}>
                  <div className={`fighter-avatar ${fighterColor(combo.character)}`}>
                    <img src={getCharacterImage(combo.character)} alt={combo.character} loading="lazy" decoding="async" width="160" height="160" />
                  </div>
                  <div className="profile-combo-copy">
                    <span>{combo.character} · STREET FIGHTER 6</span>
                    <h3>{combo.title}</h3>
                    <code>{combo.notation}</code>
                  </div>
                  <div className="profile-combo-stats">
                    <span><small>DAMAGE</small><strong>{combo.damage || '—'}</strong></span>
                    <span><small>LIKES</small><strong>{combo.likes ?? combo.saves ?? 0}</strong></span>
                  </div>
                </article>
              ))}
            </div>
            {!loading && !loadError && displayedCombos.length === 0 && (
              <div className="profile-message"><strong>{comboTab === 'liked' ? 'No liked combos yet' : 'No combos yet'}</strong><p>{comboTab === 'liked' ? 'Like a public combo and it will appear here.' : 'Create your first combo to see it here.'}</p></div>
            )}
            {comboTab === 'created' && combos.length > 0 && (
              <button className="view-all-combos" type="button" onClick={() => navigate('/my-combos')}>View all {combos.length} combos <span>→</span></button>
            )}
          </section>
        </div>
      </main>
      {showLogout && (
        <div className="logout-modal-backdrop" role="presentation" onMouseDown={() => setShowLogout(false)}>
          <section className="logout-modal" role="dialog" aria-modal="true" aria-labelledby="logout-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="logout-modal-close" type="button" onClick={() => setShowLogout(false)} aria-label="Close logout dialog">×</button>
            <div className="logout-modal-icon" aria-hidden="true">↪</div>
            <p className="eyebrow">LEAVING THE LAB?</p>
            <h2 id="logout-title">Log out of HadouKraft?</h2>
            <p>Your combos are saved. You can sign back in whenever you're ready to train again.</p>
            <div className="logout-modal-actions">
              <button className="logout-cancel" type="button" onClick={() => setShowLogout(false)} autoFocus>Stay signed in</button>
              <button className="logout-confirm" type="button" onClick={onLogout}>Log out</button>
            </div>
          </section>
        </div>
      )}
      {snackbar && <div className={`profile-snackbar ${snackbar.type}`} role="status" aria-live="polite"><span>{snackbar.type === 'success' ? '✓' : '!'}</span>{snackbar.message}<button type="button" onClick={() => setSnackbar(null)} aria-label="Dismiss notification">×</button></div>}
      <footer className="home-footer"><span>Hadoukraft</span><p>Train smarter. Hit harder.</p><small>© 2026 Hadoukraft</small></footer>
    </div>
  );
}

export default Profile;
