import { useMemo, useState } from 'react';
import '../styles/Home.css';
import '../styles/Library.css';

const communityCombos = [
  { id: 1, fighter: 'Ken', creator: 'RushdownRay', title: 'Corner carry punish', notation: '2MP · 5HP · DR · 5HP · 623HP', damage: '3,420', difficulty: 'Advanced', likes: 284, game: 'Street Fighter 6', color: 'orange' },
  { id: 2, fighter: 'Juri', creator: 'FuhaQueen', title: 'Drive rush conversion', notation: 'DR · 5MP · 2MP · 214MK · 6HK', damage: '2,860', difficulty: 'Intermediate', likes: 197, game: 'Street Fighter 6', color: 'purple' },
  { id: 3, fighter: 'Luke', creator: 'Sandblast', title: 'Reliable midscreen BnB', notation: '2MK · 236MP · 623HP', damage: '2,140', difficulty: 'Beginner', likes: 143, game: 'Street Fighter 6', color: 'blue' },
  { id: 4, fighter: 'Cammy', creator: 'DeltaRed', title: 'Meterless side switch', notation: '5HP · 236HK · 214MP · 623HK', damage: '2,730', difficulty: 'Advanced', likes: 121, game: 'Street Fighter 6', color: 'green' },
  { id: 5, fighter: 'Ryu', creator: 'DenjinDojo', title: 'Punish counter route', notation: '5HK · 5HP · 214HP · 623HP', damage: '3,080', difficulty: 'Intermediate', likes: 98, game: 'Street Fighter 6', color: 'red' },
  { id: 6, fighter: 'A.K.I.', creator: 'VenomLab', title: 'Toxic blossom setup', notation: '2LP · 5LP · 236LP · 214HP', damage: '2,490', difficulty: 'Expert', likes: 87, game: 'Street Fighter 6', color: 'violet' },
];

function Header({ navigate, active, user }) {
  const go = (event, path) => { event.preventDefault(); navigate(path); };
  return (
    <header className="home-header">
      <a className="home-brand" href="/home" onClick={(event) => go(event, '/home')}><span className="brand-mark">HK</span><span>Hadou<span>Kraft</span></span></a>
      <nav className="home-nav" aria-label="Main navigation">
        <a href="/home" onClick={(event) => go(event, '/home')}>Home</a>
        <a className={active === 'explore' ? 'active' : ''} href="/combos" onClick={(event) => go(event, '/combos')}>Explore</a>
        <a className={active === 'mine' ? 'active' : ''} href="/my-combos" onClick={(event) => go(event, '/my-combos')}>My Combos</a>
      </nav>
      <div className="home-user"><button className="icon-button" type="button" aria-label="Notifications">●</button><button className="avatar" type="button" aria-label="Open profile" onClick={() => navigate('/profile')}>{user.name.charAt(0).toUpperCase()}</button></div>
    </header>
  );
}

function Combos({ navigate, user }) {
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState('All levels');
  const [saved, setSaved] = useState(new Set([2]));

  const results = useMemo(() => communityCombos.filter((combo) => {
    const matchesText = `${combo.fighter} ${combo.title} ${combo.creator}`.toLowerCase().includes(query.toLowerCase());
    return matchesText && (difficulty === 'All levels' || combo.difficulty === difficulty);
  }), [query, difficulty]);

  const toggleSaved = (id) => setSaved((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="home-page library-page">
      <Header navigate={navigate} active="explore" user={user} />
      <main className="library-main">
        <section className="library-heading">
          <div><p className="eyebrow">COMMUNITY LAB</p><h1>Explore combos</h1><p>Discover routes built and tested by fighters around the world.</p></div>
          <div className="community-count"><span>●</span><strong>1,284</strong><small>COMBOS SHARED</small></div>
        </section>
        <section className="combo-toolbar" aria-label="Combo filters">
          <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search fighter, combo, or creator..." /></label>
          <select aria-label="Game"><option>Street Fighter 6</option></select>
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} aria-label="Difficulty">
            <option>All levels</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>Expert</option>
          </select>
        </section>
        <div className="results-row"><p><strong>{results.length}</strong> combos found</p><button type="button">Trending <span>↓</span></button></div>
        <section className="explore-grid">
          {results.map((combo) => (
            <article className="explore-card" key={combo.id}>
              <div className="explore-card-top"><div className={`fighter-avatar ${combo.color}`}>{combo.fighter[0]}</div><div><strong>{combo.fighter}</strong><span>by @{combo.creator}</span></div><button className={saved.has(combo.id) ? 'saved' : ''} onClick={() => toggleSaved(combo.id)} type="button" aria-label={`Save ${combo.title}`}>{saved.has(combo.id) ? '♥' : '♡'}</button></div>
              <div className="difficulty-line"><span>{combo.game}</span><i className={combo.difficulty.toLowerCase()}>{combo.difficulty}</i></div>
              <h2>{combo.title}</h2>
              <div className="explore-notation">{combo.notation}</div>
              <div className="explore-meta"><span><small>DAMAGE</small><strong>{combo.damage}</strong></span><span><small>LIKES</small><strong>♥ {combo.likes}</strong></span><button type="button">View combo <b>→</b></button></div>
            </article>
          ))}
        </section>
        {results.length === 0 && <div className="empty-results"><strong>No combos found</strong><p>Try another fighter or difficulty level.</p></div>}
      </main>
    </div>
  );
}

export { Header };
export default Combos;
