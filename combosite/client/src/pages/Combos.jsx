import { useEffect, useMemo, useRef, useState } from 'react';
import '../styles/Home.css';
import '../styles/Library.css';
import sf6Art from '../assets/sf6-optimized.jpg';
import { getExploreCombos, toggleComboLike, toggleFollow } from '../lib/api.js';
import { getCharacterImage } from '../lib/characterImages.js';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import Notifications from '../components/Notifications.jsx';

const fighterColor = (fighter) => {
  if (['Ken', 'Marisa', 'Dhalsim'].includes(fighter)) return 'orange';
  if (['Juri', 'A.K.I.', 'M. Bison'].includes(fighter)) return 'purple';
  if (['Luke', 'Chun-Li', 'Guile'].includes(fighter)) return 'blue';
  if (['Cammy', 'Blanka', 'Dee Jay'].includes(fighter)) return 'green';
  return 'red';
};

const fighterOptions = [
  'All fighters', 'A.K.I.', 'Akuma', 'Alex', 'Blanka', 'Cammy', 'Chun-Li', 'C. Viper',
  'Dee Jay', 'Dhalsim', 'E. Honda', 'Ed', 'Elena', 'Guile', 'Ingrid', 'Jamie', 'J.P.',
  'Juri', 'Ken', 'Kimberly', 'Lily', 'Luke', 'M. Bison', 'Mai', 'Manon', 'Marisa',
  'Rashid', 'Ryu', 'Sagat', 'Terry', 'Zangief',
];

function FighterSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (event.key === 'Escape' || (event.type === 'mousedown' && !root.current?.contains(event.target))) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, []);

  return (
    <div className={`fighter-select ${open ? 'open' : ''}`} ref={root}>
      <button type="button" className="fighter-select-trigger" onClick={() => setOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={open}>
        {value === 'All fighters' ? <span className="fighter-select-all" aria-hidden="true">✦</span> : <img src={getCharacterImage(value)} alt="" />}
        <span>{value}</span><i aria-hidden="true">⌄</i>
      </button>
      {open && <div className="fighter-select-menu" role="listbox" aria-label="Fighter">
        {fighterOptions.map((option) => (
          <button type="button" role="option" aria-selected={value === option} className={value === option ? 'selected' : ''} key={option} onClick={() => { onChange(option); setOpen(false); }}>
            {option === 'All fighters' ? <span className="fighter-select-all" aria-hidden="true">✦</span> : <img src={getCharacterImage(option)} alt="" loading="lazy" />}
            <span>{option}</span>{value === option && <b aria-hidden="true">✓</b>}
          </button>
        ))}
      </div>}
    </div>
  );
}

function FilterSelect({ value, onChange, options, label }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (event.key === 'Escape' || (event.type === 'mousedown' && !root.current?.contains(event.target))) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, []);

  return (
    <div className={`filter-select ${open ? 'open' : ''}`} ref={root}>
      <button type="button" className="filter-select-trigger" onClick={() => setOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={open}>
        <span>{value}</span><i aria-hidden="true">⌄</i>
      </button>
      {open && <div className="filter-select-menu" role="listbox" aria-label={label}>
        {options.map((option) => (
          <button type="button" role="option" aria-selected={value === option} className={value === option ? 'selected' : ''} key={option} onClick={() => { onChange(option); setOpen(false); }}>
            <span>{option}</span>{value === option && <b aria-hidden="true">✓</b>}
          </button>
        ))}
      </div>}
    </div>
  );
}

function Header({ navigate, active, user }) {
  const go = (event, path) => { event.preventDefault(); navigate(path); };
  return (
    <header className="home-header">
      <a className="home-brand" href="/home" onClick={(event) => go(event, '/home')}><span className="brand-mark">HK</span><span>Hadou<span>Kraft</span></span></a>
      <nav className="home-nav" aria-label="Main navigation">
        <a className={active === 'home' ? 'active' : ''} href="/home" onClick={(event) => go(event, '/home')}>Home</a>
        {user && <a href="/create" onClick={(event) => go(event, '/create')}>Create Combo</a>}
        <a className={active === 'explore' ? 'active' : ''} href="/combos" onClick={(event) => go(event, '/combos')}>Explore</a>
        <a className={active === 'mine' ? 'active' : ''} href="/my-combos" onClick={(event) => go(event, '/my-combos')}>My Combos</a>
      </nav>
      <div className="home-user">
        {user ? (
          <>
            <Notifications navigate={navigate} />
            <button className="avatar" type="button" aria-label="Open profile" onClick={() => navigate('/profile')}>{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.name.charAt(0).toUpperCase()}</button>
          </>
        ) : <button className="header-login" type="button" onClick={() => navigate('/login')}>Sign in</button>}
      </div>
    </header>
  );
}

function Combos({ navigate, user }) {
  const [communityCombos, setCommunityCombos] = useState([]);
  const [query, setQuery] = useState('');
  const [fighter, setFighter] = useState('All fighters');
  const [difficulty, setDifficulty] = useState('All levels');
  const [sortBy, setSortBy] = useState('Most recent');
  const [followingOnly, setFollowingOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [likeError, setLikeError] = useState('');
  const [shareStatus, setShareStatus] = useState({ id: '', message: '' });

  const results = useMemo(() => {
    const filtered = communityCombos.filter((combo) => {
      const matchesText = `${combo.character} ${combo.title} ${combo.creator}`.toLowerCase().includes(query.toLowerCase());
      const matchesFighter = fighter === 'All fighters' || combo.character === fighter;
      const matchesDifficulty = difficulty === 'All levels' || combo.difficulty === difficulty;
      return matchesText && matchesFighter && matchesDifficulty && (!followingOnly || combo.followed);
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
  }, [communityCombos, query, fighter, difficulty, followingOnly, sortBy]);

  useEffect(() => {
    let active = true;
    getExploreCombos()
      .then((combos) => { if (active) setCommunityCombos(combos); })
      .catch((problem) => { if (active) setLoadError(problem.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const toggleLiked = async (id) => {
    if (!user) {
      navigate('/login');
      return;
    }
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

  const toggleCreatorFollow = async (creatorId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setLikeError('');
    try {
      const result = await toggleFollow(creatorId);
      setCommunityCombos((current) => current.map((combo) =>
        combo.userId === creatorId ? { ...combo, followed: result.followed } : combo
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
              <label>Fighter<FighterSelect value={fighter} onChange={setFighter} /></label>
              <label>Sort by
                <FilterSelect label="Sort by" value={sortBy} onChange={setSortBy} options={['Most recent', 'Most popular', 'Highest damage']} />
              </label>
              <label>Difficulty
                <FilterSelect label="Difficulty" value={difficulty} onChange={setDifficulty} options={['All levels', 'Beginner', 'Intermediate', 'Advanced', 'Expert']} />
              </label>
              <button type="button" className={followingOnly ? 'active-filter filter-toggle' : 'filter-toggle'} onClick={() => user ? setFollowingOnly((value) => !value) : navigate('/login')}>
                {followingOnly ? 'Following only' : 'Following'} <span>＋</span>
              </button>
            </div>
          </aside>
          <section className="library-content">
            <section className="library-heading">
              <div><h1>Explore combos</h1></div>
            </section>
            <div className="results-row">
              <p><strong>{loading ? '—' : results.length}</strong> combos found</p>
            </div>
            {loading && <SkeletonLoader variant="explore" count={3} />}
            {loadError && <p className="library-message error" role="alert">{loadError}</p>}
            {likeError && <p className="library-message error" role="alert">{likeError}</p>}
            {!loading && <section className="explore-grid">
              {results.map((combo) => (
                <article className="explore-card" key={combo.id}>
                  <div className="explore-card-top">
                    <div className="combo-identities">
                      <div className={`fighter-avatar ${fighterColor(combo.character)}`}>
                        <img src={getCharacterImage(combo.character)} alt={`${combo.character} character`} loading="lazy" decoding="async" width="160" height="160" />
                      </div>
                      <button className="creator-avatar" type="button" onClick={() => navigate(`/profile/${combo.userId}`)} aria-label={`View ${combo.creator}'s profile`}>
                        {combo.avatarUrl ? <img src={combo.avatarUrl} alt="" loading="lazy" /> : <span>{combo.creator?.charAt(0).toUpperCase()}</span>}
                      </button>
                    </div>
                    <div><strong>{combo.character}</strong><div className="creator-actions"><button className="creator-link" type="button" onClick={() => navigate(`/profile/${combo.userId}`)}>by {combo.creator}</button>{user?.id !== combo.userId && <button className={`card-follow-button ${combo.followed ? 'following' : ''}`} type="button" onClick={() => toggleCreatorFollow(combo.userId)}>{combo.followed ? 'Following' : 'Follow'}</button>}</div></div>
                    <button className={combo.liked ? 'saved' : ''} onClick={() => toggleLiked(combo.id)} type="button" aria-label={user ? `${combo.liked ? 'Unlike' : 'Like'} ${combo.title}` : 'Sign in to like this combo'}>{combo.liked ? '♥' : '♡'}</button>
                  </div>
                  <div className="difficulty-line"><span>{combo.game}</span><i className={combo.difficulty.toLowerCase()}>{combo.difficulty}</i></div>
                  <h2>{combo.title}</h2>
                  <div className="explore-notation">{combo.notation}</div>
                  {combo.video?.url && (
                    <video className="explore-video" controls preload="none" playsInline poster={getCharacterImage(combo.character)}>
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
            </section>}
            {!loading && !loadError && results.length === 0 && (
              <div className="empty-results">
                <strong>{followingOnly ? 'No combos from followed players' : 'No published combos found'}</strong>
                <p>{followingOnly ? 'Follow a creator to see their published combos here.' : 'Publish a public combo and it will appear here.'}</p>
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
