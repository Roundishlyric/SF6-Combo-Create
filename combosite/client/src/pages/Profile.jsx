import { useEffect, useState } from 'react';
import '../styles/Home.css';
import '../styles/Profile.css';
import { getCombos } from '../lib/api.js';

const recentCombos = [
  { fighter: 'Ken', title: 'Corner carry punish', notation: '2MP · 5HP · DR · 5HP · 623HP', damage: '3,420', views: '1.2K', color: 'orange' },
  { fighter: 'Luke', title: 'Midscreen confirm', notation: '2MK · 236MP · 623HP', damage: '2,140', views: '684', color: 'blue' },
  { fighter: 'Juri', title: 'Fuha stock conversion', notation: '5MP · 2MP · 214MK · 6HK', damage: '2,860', views: '453', color: 'purple' },
];

const achievements = [
  { icon: '✦', title: 'Lab Monster', detail: 'Create 10 combos', tone: 'orange' },
  { icon: '◆', title: 'Crowd Favorite', detail: 'Reach 1,000 views', tone: 'blue' },
  { icon: '⌁', title: 'On a Roll', detail: '7 day training streak', tone: 'purple' },
];

function Profile({ navigate, user, onLogout }) {
  const [following, setFollowing] = useState(false);
  const [combos, setCombos] = useState([]);
  useEffect(() => {
    let active = true;
    getCombos().then((result) => { if (active) setCombos(result); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const totalViews = combos.reduce((sum, combo) => sum + Number(combo.views || 0), 0);

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
          <button className="icon-button" type="button" aria-label="Notifications">●</button>
          <button className="avatar active-avatar" type="button" aria-label="Profile">{user.name.charAt(0).toUpperCase()}</button>
        </div>
      </header>

      <main className="profile-main">
        <section className="profile-hero">
          <div className="profile-cover">
            <span className="cover-grid" />
            <span className="cover-streak">7 DAY STREAK <b>🔥</b></span>
          </div>
          <div className="profile-identity">
            <div className="profile-portrait" aria-hidden="true"><span>{user.name.charAt(0).toUpperCase()}</span><i /></div>
            <div className="identity-copy">
              <div className="name-row"><h1>{user.name}</h1><span className="player-level">NEW PLAYER</span></div>
              <p className="player-handle">{user.email}</p>
              <p className="player-bio">Ken main. Lab enthusiast. Always looking for the next clean conversion.</p>
              <div className="player-tags"><span>Street Fighter 6</span><span>Ken</span><span>Diamond</span></div>
            </div>
            <div className="profile-actions">
              <button className="follow-button" type="button" onClick={() => setFollowing((value) => !value)}>
                {following ? 'Following' : '+ Follow'}
              </button>
              <button className="logout-button" type="button" onClick={onLogout}>
                <span aria-hidden="true">↪</span> Log out
              </button>
              <button className="more-button" type="button" aria-label="More profile actions">•••</button>
            </div>
          </div>
          <div className="profile-numbers" aria-label="Player statistics">
            <div><strong>{combos.length}</strong><span>Combos</span></div>
            <div><strong>{totalViews.toLocaleString()}</strong><span>Total views</span></div>
            <div><strong>184</strong><span>Followers</span></div>
            <div><strong>63</strong><span>Following</span></div>
            <div className="rank-stat"><small>RANK</small><strong>Diamond 2</strong><span>21,440 LP</span></div>
          </div>
        </section>

        <div className="profile-layout">
          <section className="profile-content">
            <div className="profile-section-title">
              <div><p className="eyebrow">THE LAB</p><h2>Recent combos</h2></div>
              <button type="button" onClick={() => navigate('/create')}>Create combo <span>＋</span></button>
            </div>
            <div className="profile-combo-list">
              {recentCombos.map((combo) => (
                <article className="profile-combo" key={combo.title}>
                  <div className={`fighter-avatar ${combo.color}`}>{combo.fighter[0]}</div>
                  <div className="profile-combo-copy">
                    <span>{combo.fighter} · STREET FIGHTER 6</span>
                    <h3>{combo.title}</h3>
                    <code>{combo.notation}</code>
                  </div>
                  <div className="profile-combo-stats">
                    <span><small>DAMAGE</small><strong>{combo.damage}</strong></span>
                    <span><small>VIEWS</small><strong>{combo.views}</strong></span>
                    <button type="button" aria-label={`Open ${combo.title}`}>→</button>
                  </div>
                </article>
              ))}
            </div>
            <button className="view-all-combos" type="button" onClick={() => navigate('/my-combos')}>View all 12 combos <span>→</span></button>
          </section>

          <aside className="profile-sidebar">
            <section className="side-card">
              <div className="side-title"><h2>Achievements</h2><span>6 / 12</span></div>
              <div className="achievement-list">
                {achievements.map((item) => (
                  <div className="achievement" key={item.title}>
                    <span className={item.tone}>{item.icon}</span>
                    <div><strong>{item.title}</strong><small>{item.detail}</small></div>
                  </div>
                ))}
              </div>
              <button type="button">View all achievements</button>
            </section>
            <section className="side-card training-card">
              <p className="eyebrow">TRAINING THIS WEEK</p>
              <div className="training-heading"><strong>4h 32m</strong><span>+18%</span></div>
              <div className="week-bars" aria-label="Weekly training activity">
                {[38, 66, 44, 88, 72, 26, 54].map((height, index) => (
                  <div key={index}><i style={{ height: `${height}%` }} /><small>{'MTWTFSS'[index]}</small></div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>
      <footer className="home-footer"><span>Hadoukraft</span><p>Train smarter. Hit harder.</p><small>© 2026 Hadoukraft</small></footer>
    </div>
  );
}

export default Profile;
