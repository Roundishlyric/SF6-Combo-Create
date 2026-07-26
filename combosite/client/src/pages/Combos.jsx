import { useEffect, useMemo, useState } from 'react';
import '../styles/Home.css';
import '../styles/Library.css';
import sf6Art from '../assets/sf6-optimized.jpg';
import { getExploreCombos, toggleComboLike } from '../lib/api.js';
import { getCharacterImage } from '../lib/characterImages.js';

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
  const [fighter, setFighter] = useState('All fighters');
  const [difficulty, setDifficulty] = useState('All levels');
  const [sortBy, setSortBy] = useState('Most recent');
  const [likedOnly, setLikedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [likeError, setLikeError] = useState('');
  const [shareStatus, setShareStatus] = useState({ id: '', message: '' });

  const fighterOptions = useMemo(() => {
    const fighters = communityCombos.map((combo) => combo.character).filter(Boolean);
    return ['All fighters', ...Array.from(new Set(fighters))];
  }, [communityCombos]);

  const results = useMemo(() => {
    const filtered = communityCombos.filter((combo) => {
      const matchesText = `${combo.character} ${combo.title} ${combo.creator}`.toLowerCase().includes(query.toLowerCase());
      const matchesFighter = fighter === 'All fighters' || combo.character === fighter;
      const matchesDifficulty = difficulty === 'All levels' || combo.difficulty === difficulty;
      return matchesText && matchesFighter && matchesDifficulty && (!likedOnly || combo.liked);
    });

    const toNumber = (value) => Number(String(value).replace(/[^0-9.-]/g, '')) || 0;

    return [...filtered].sort((a, b) => {
      if (sortBy === 'Most popular') {
        return (b.likes || 0) - (a.likes || 0) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === 'Highest damage') {
        return toNumber(b.damage) - toNumber(a.damage) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [communityCombos, query, fighter, difficulty, likedOnly, sortBy]);

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

  const shareCombo = async (combo) => {
    const url = `${window.location.origin}/combos`;
    const text = `${combo.character} — ${combo.title}\n${combo.notation}`;
    const shareData = {
      title: `${combo.title} | HadouKraft`,
      text,
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareStatus({ id: combo.id, message: 'Shared!' });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setShareStatus({ id: combo.id, message: 'Copied!' });
      }
      window.setTimeout(() => setShareStatus({ id: '', message: '' }), 2000);
    } catch (problem) {
      if (problem.name !== 'AbortError') {
        setShareStatus({ id: combo.id, message: 'Could not share' });
        window.setTimeout(() => setShareStatus({ id: '', message: '' }), 2500);
      }
    }
  };

  return (
    <div className="home-page library-page">
      <Header navigate={navigate} active="explore" user={user} />
      <main className="library-main">
        <section className="explore-hero" aria-label="Explore featured combos">
          <img src={sf6Art} alt="Street Fighter 6 roster artwork" fetchPriority="high" />
          <div className="explore-hero-overlay" />
          <div className="explore-hero-copy">
            <span className="eyebrow">FEATURED ROUTES</span>
            <h2>Find fresh combo ideas from the community.</h2>
            <p>Search by fighter, sort by what is trending, and jump into the latest setups.</p>
          </div>
        </section>
        <div className="library-layout">
          <aside className="filter-sidebar" aria-label="Combo filters">
            <div className="filter-panel">
              <h2>Filters</h2>
              <label className="search-box sidebar-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search fighter, combo, or creator..." /></label>
              <label>Fighter
                <select value={fighter} onChange={(event) => setFighter(event.target.value)}>
                  {fighterOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>Sort by
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option>Most recent</option>
                  <option>Most popular</option>
                  <option>Highest damage</option>
                </select>
              </label>
              <label>Difficulty
                <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                  <option>All levels</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>Expert</option>
                </select>
              </label>
              <button type="button" className={likedOnly ? 'active-filter filter-toggle' : 'filter-toggle'} onClick={() => setLikedOnly((value) => !value)}>
                {likedOnly ? 'Liked combos' : 'Liked only'} <span>♥</span>
              </button>
            </div>
          </aside>
          <section className="library-content">
            <section className="library-heading">
              <div><h1>Explore combos</h1></div>
            </section>
            <div className="results-row">
              <p><strong>{results.length}</strong> combos found</p>
            </div>
            {loading && <p className="library-message">Loading published combos…</p>}
            {loadError && <p className="library-message error" role="alert">{loadError}</p>}
            {likeError && <p className="library-message error" role="alert">{likeError}</p>}
            <section className="explore-grid">
              {results.map((combo) => (
                <article className="explore-card" key={combo.id}>
                  <div className="explore-card-top">
                    <div className={`fighter-avatar ${fighterColor(combo.character)}`}>
                      <img src={getCharacterImage(combo.character)} alt={combo.character} loading="lazy" decoding="async" width="160" height="160" />
                    </div>
                    <div><strong>{combo.character}</strong><span>by {combo.creator}</span></div>
                    <button className={combo.liked ? 'saved' : ''} onClick={() => toggleLiked(combo.id)} type="button" aria-label={`${combo.liked ? 'Unlike' : 'Like'} ${combo.title}`}>{combo.liked ? '♥' : '♡'}</button>
                  </div>
                  <div className="difficulty-line"><span>{combo.game}</span><i className={combo.difficulty.toLowerCase()}>{combo.difficulty}</i></div>
                  <h2>{combo.title}</h2>
                  <div className="explore-notation">{combo.notation}</div>
                  {combo.video?.url && (
                    <video className="explore-video" controls preload="none" playsInline>
                      <source src={combo.video.url} type={combo.video.type} />
                      Your browser does not support video playback.
                    </video>
                  )}
                  <div className="explore-meta">
                    <span><small>DAMAGE</small><strong>{combo.damage || '—'}</strong></span>
                    <span><small>LIKES</small><strong>♥ {combo.likes}</strong></span>
                    <button type="button" onClick={() => shareCombo(combo)} aria-label={`Share ${combo.title}`}>
                      {shareStatus.id === combo.id ? shareStatus.message : 'Share'} <b aria-hidden="true">↗</b>
                    </button>
                  </div>
                </article>
              ))}
            </section>
            {!loading && !loadError && results.length === 0 && (
              <div className="empty-results">
                <strong>{likedOnly ? 'No liked combos yet' : 'No published combos found'}</strong>
                <p>{likedOnly ? 'Like a published combo to keep it here.' : 'Publish a public combo and it will appear here.'}</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export { Header };
export default Combos;
