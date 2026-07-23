import sf6Art from '../assets/sf6.jpg';
import '../styles/Home.css';

const combos = [
  { character: 'Ken', initials: 'K', title: 'Corner carry punish', inputs: '2MP  ·  5HP  ·  DR  ·  5HP  ·  623HP', damage: '3,420', level: 'Advanced', color: 'orange' },
  { character: 'Juri', initials: 'J', title: 'Drive rush conversion', inputs: 'DR  ·  5MP  ·  2MP  ·  214MK  ·  6HK', damage: '2,860', level: 'Intermediate', color: 'purple' },
  { character: 'Luke', initials: 'L', title: 'Reliable midscreen BnB', inputs: '2MK  ·  236MP  ·  623HP', damage: '2,140', level: 'Beginner', color: 'blue' },
];

function Home({ navigate, user }) {
  const go = (event, path) => {
    event.preventDefault();
    navigate(path);
  };

  return (
    <div className="home-page">
      <header className="home-header">
        <a className="home-brand" href="/home" onClick={(event) => go(event, '/home')}>
          <span className="brand-mark">HK</span>
          <span>Hadou<span>Kraft</span></span>
        </a>

        <nav className="home-nav" aria-label="Main navigation">
          <a className="active" href="/home" onClick={(event) => go(event, '/home')}>Home</a>
          <a href="/combos" onClick={(event) => go(event, '/combos')}>Explore</a>
          <a href="/my-combos" onClick={(event) => go(event, '/my-combos')}>My Combos</a>
        </nav>

        <div className="home-user">
          <button className="icon-button" aria-label="Notifications">●</button>
          <button className="avatar" aria-label="Open profile" onClick={() => navigate('/profile')}>{user.name.charAt(0).toUpperCase()}</button>
        </div>
      </header>

      <main className="home-main">
        <section className="welcome-row">
          <div>
            <p className="eyebrow">PLAYER DASHBOARD</p>
            <h1>Welcome back, {user.name.split(' ')[0]}.</h1>
            <p>Your next combo starts with one clean hit.</p>
          </div>
          <button className="create-button" onClick={() => navigate('/create')}><span>＋</span> Create Combo</button>
        </section>

        <section className="feature-card">
          <img src={sf6Art} alt="Street Fighter 6 roster artwork" />
          <div className="feature-shade" />
          <div className="feature-copy">
            <span className="feature-label">FEATURED THIS WEEK</span>
            <h2>Master the neutral.<br />Own the match.</h2>
            <p>Explore community-tested routes, matchup tech, and creative conversions for every fighter.</p>
            <button onClick={() => navigate('/combos')}>Explore Combos <span>→</span></button>
          </div>
          <div className="feature-stat">
            <strong>1,284</strong>
            <span>COMBOS SHARED</span>
          </div>
        </section>

        <section className="stats-grid" aria-label="Your statistics">
          <article><span className="stat-icon orange">✦</span><div><strong>12</strong><span>Combos created</span></div><small>+3 this week</small></article>
          <article><span className="stat-icon blue">◆</span><div><strong>47</strong><span>Combos saved</span></div><small>Keep training</small></article>
          <article><span className="stat-icon purple">⌁</span><div><strong>2.6K</strong><span>Total views</span></div><small>+18% this month</small></article>
        </section>

        <section className="combo-section">
          <div className="section-heading">
            <div><p className="eyebrow">COMMUNITY PICKS</p><h2>Trending Combos</h2></div>
            <button onClick={() => navigate('/combos')}>View all <span>→</span></button>
          </div>

          <div className="combo-grid">
            {combos.map((combo) => (
              <article className="combo-card" key={combo.title}>
                <div className="combo-top">
                  <div className={`fighter-avatar ${combo.color}`}>{combo.initials}</div>
                  <div><strong>{combo.character}</strong><span>Street Fighter 6</span></div>
                  <button aria-label={`Save ${combo.title}`}>♡</button>
                </div>
                <h3>{combo.title}</h3>
                <div className="combo-inputs">{combo.inputs}</div>
                <div className="combo-meta">
                  <span><small>DAMAGE</small><strong>{combo.damage}</strong></span>
                  <span><small>DIFFICULTY</small><strong>{combo.level}</strong></span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="home-footer"><span>Hadoukraft</span><p>Train smarter. Hit harder.</p><small>© 2026 Hadoukraft</small></footer>
    </div>
  );
}

export default Home;
