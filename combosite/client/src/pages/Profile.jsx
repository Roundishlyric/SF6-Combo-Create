import { useEffect, useMemo, useState } from 'react';
import '../styles/Home.css';
import '../styles/Profile.css';
import { getCombos } from '../lib/api.js';
import { getCharacterImage } from '../lib/characterImages.js';

const fighterColor = (fighter) => {
  if (['Ken', 'Marisa', 'Dhalsim'].includes(fighter)) return 'orange';
  if (['Juri', 'A.K.I.', 'M. Bison'].includes(fighter)) return 'purple';
  if (['Luke', 'Chun-Li', 'Guile'].includes(fighter)) return 'blue';
  return 'red';
};

function Profile({ navigate, user, onLogout }) {
  const [combos, setCombos] = useState([]);
  const [loadError, setLoadError] = useState('');
  const recentCombos = useMemo(
    () => [...combos].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 3),
    [combos],
  );

  useEffect(() => {
    let active = true;
    getCombos()
      .then((result) => { if (active) setCombos(result); })
      .catch((problem) => { if (active) setLoadError(problem.message); });
    return () => { active = false; };
  }, []);

  const totalViews = combos.reduce((sum, combo) => sum + Number(combo.views || 0), 0);
  const totalLikes = combos.reduce((sum, combo) => sum + Number(combo.saves || 0), 0);
  const confirmLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      onLogout();
    }
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
          <a href="/combos" onClick={(event) => go(event, '/combos')}>Explore</a>
          <a href="/my-combos" onClick={(event) => go(event, '/my-combos')}>My Combos</a>
        </nav>
        <div className="home-user">
          <button className="avatar active-avatar" type="button" aria-label="Profile">{user.name.charAt(0).toUpperCase()}</button>
        </div>
      </header>

      <main className="profile-main">
        <section className="profile-hero">
          <div className="profile-cover"><span className="cover-grid" /></div>
          <div className="profile-identity">
            <div className="profile-portrait" aria-hidden="true"><span>{user.name.charAt(0).toUpperCase()}</span><i /></div>
            <div className="identity-copy">
              <div className="name-row"><h1>{user.name}</h1></div>
              <p className="player-handle">{user.email}</p>
            </div>
            <div className="profile-actions">
              <button className="logout-button" type="button" onClick={confirmLogout}>
                <span aria-hidden="true">↪</span> Log out
              </button>
            </div>
          </div>
          <div className="profile-numbers" aria-label="Player statistics">
            <div><strong>{combos.length}</strong><span>Combos</span></div>
            <div><strong>{totalLikes}</strong><span>Likes received</span></div>
            <div><strong>{totalViews}</strong><span>Total views</span></div>
          </div>
        </section>

        <div className="profile-layout">
          <section className="profile-content">
            <div className="profile-section-title">
              <div><p className="eyebrow">THE LAB</p><h2>Recent combos</h2></div>
              <button type="button" onClick={() => navigate('/create')}>Create combo <span>＋</span></button>
            </div>
            {loadError && <p className="profile-message error" role="alert">{loadError}</p>}
            <div className="profile-combo-list">
              {recentCombos.map((combo) => (
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
                    <span><small>LIKES</small><strong>{combo.saves || 0}</strong></span>
                    <span><small>VIEWS</small><strong>{combo.views || 0}</strong></span>
                  </div>
                </article>
              ))}
            </div>
            {!loadError && recentCombos.length === 0 && (
              <div className="profile-message"><strong>No combos yet</strong><p>Create your first combo to see it here.</p></div>
            )}
            {combos.length > 0 && (
              <button className="view-all-combos" type="button" onClick={() => navigate('/my-combos')}>View all {combos.length} combos <span>→</span></button>
            )}
          </section>
        </div>
      </main>
      <footer className="home-footer"><span>Hadoukraft</span><p>Train smarter. Hit harder.</p><small>© 2026 Hadoukraft</small></footer>
    </div>
  );
}

export default Profile;
