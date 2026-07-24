import { useEffect, useMemo, useState } from 'react';
import '../styles/Home.css';
import '../styles/Library.css';
import { getExploreCombos, toggleComboLike } from '../lib/api.js';

const fighterColor = (fighter) => {
  if (['Ken', 'Marisa', 'Dhalsim'].includes(fighter)) return 'orange';
  if (['Juri', 'A.K.I.', 'M. Bison'].includes(fighter)) return 'purple';
  if (['Luke', 'Chun-Li', 'Guile'].includes(fighter)) return 'blue';
  if (['Cammy', 'Blanka', 'Dee Jay'].includes(fighter)) return 'green';
  return 'red';
};

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
  const [communityCombos, setCommunityCombos] = useState([]);
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState('All levels');
  const [likedOnly, setLikedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [likeError, setLikeError] = useState('');

  const results = useMemo(() => communityCombos.filter((combo) => {
    const matchesText = `${combo.character} ${combo.title} ${combo.creator}`.toLowerCase().includes(query.toLowerCase());
    const matchesDifficulty = difficulty === 'All levels' || combo.difficulty === difficulty;
    return matchesText && matchesDifficulty && (!likedOnly || combo.liked);
  }), [communityCombos, query, difficulty, likedOnly]);

  useEffect(() => {
    let active = true;
    getExploreCombos()
      .then((combos) => { if (active) setCommunityCombos(combos); })
      .catch((problem) => { if (active) setLoadError(problem.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const toggleLiked = async (id) => {
    setLikeError('');
    try {
      const result = await toggleComboLike(id);
      setCommunityCombos((current) => current.map((combo) =>
        combo.id === id ? { ...combo, liked: result.liked, likes: result.likes } : combo
      ));
    } catch (problem) {
      setLikeError(problem.message);
    }
  };

  return (
    <div className="home-page library-page">
      <Header navigate={navigate} active="explore" user={user} />
      <main className="library-main">
        <section className="library-heading">
          <div><p className="eyebrow">COMMUNITY LAB</p><h1>Explore combos</h1><p>Discover routes published by the HadouKraft community.</p></div>
          <div className="community-count"><span>●</span><strong>{communityCombos.length}</strong><small>COMBOS SHARED</small></div>
        </section>
        <section className="combo-toolbar" aria-label="Combo filters">
          <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search fighter, combo, or creator..." /></label>
          <select aria-label="Game"><option>Street Fighter 6</option></select>
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} aria-label="Difficulty">
            <option>All levels</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>Expert</option>
          </select>
        </section>
        <div className="results-row">
          <p><strong>{results.length}</strong> combos found</p>
          <button className={likedOnly ? 'active-filter' : ''} onClick={() => setLikedOnly((value) => !value)} type="button">
            {likedOnly ? 'Liked combos' : 'All combos'} <span>♥</span>
          </button>
        </div>
        {loading && <p className="library-message">Loading published combos…</p>}
        {loadError && <p className="library-message error" role="alert">{loadError}</p>}
        {likeError && <p className="library-message error" role="alert">{likeError}</p>}
        <section className="explore-grid">
          {results.map((combo) => (
            <article className="explore-card" key={combo.id}>
              <div className="explore-card-top">
                <div className={`fighter-avatar ${fighterColor(combo.character)}`}>{combo.character[0]}</div>
                <div><strong>{combo.character}</strong><span>by {combo.creator}</span></div>
                <button className={combo.liked ? 'saved' : ''} onClick={() => toggleLiked(combo.id)} type="button" aria-label={`${combo.liked ? 'Unlike' : 'Like'} ${combo.title}`}>{combo.liked ? '♥' : '♡'}</button>
              </div>
              <div className="difficulty-line"><span>{combo.game}</span><i className={combo.difficulty.toLowerCase()}>{combo.difficulty}</i></div>
              <h2>{combo.title}</h2>
              <div className="explore-notation">{combo.notation}</div>
              {combo.video?.url && (
                <video className="explore-video" controls preload="metadata" playsInline muted={false}>
                  <source src={combo.video.url} type={combo.video.type} />
                  Your browser does not support video playback.
                </video>
              )}
              <div className="explore-meta"><span><small>DAMAGE</small><strong>{combo.damage || '—'}</strong></span><span><small>LIKES</small><strong>♥ {combo.likes}</strong></span></div>
            </article>
          ))}
        </section>
        {!loading && !loadError && results.length === 0 && (
          <div className="empty-results">
            <strong>{likedOnly ? 'No liked combos yet' : 'No published combos found'}</strong>
            <p>{likedOnly ? 'Like a published combo to keep it here.' : 'Publish a public combo and it will appear here.'}</p>
          </div>
        )}
      </main>
    </div>
  );
}

export { Header };
export default Combos;
