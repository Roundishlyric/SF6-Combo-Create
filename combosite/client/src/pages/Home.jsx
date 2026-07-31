import { useEffect, useMemo, useState } from 'react';
import sf6Art from '../assets/sf6-optimized.jpg';
import '../styles/Home.css';
import { getCombos, getExploreCombos, toggleComboLike } from '../lib/api.js';
import { getCharacterImage } from '../lib/characterImages.js';
import SkeletonLoader from '../components/SkeletonLoader.jsx';

const fighterColor = (fighter) => {
  if (['Ken', 'Marisa', 'Dhalsim'].includes(fighter)) return 'orange';
  if (['Juri', 'A.K.I.', 'M. Bison'].includes(fighter)) return 'purple';
  if (['Luke', 'Chun-Li', 'Guile'].includes(fighter)) return 'blue';
  return 'red';
};

function Home({ navigate, user }) {
  const [publishedCombos, setPublishedCombos] = useState([]);
  const [myCombos, setMyCombos] = useState([]);
  const [comboError, setComboError] = useState('');
  const [loading, setLoading] = useState(true);
  const trendingCombos = useMemo(
    () => [...publishedCombos].sort((a, b) => b.likes - a.likes || new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3),
    [publishedCombos],
  );

  useEffect(() => {
    let active = true;
    Promise.all([getExploreCombos(), user ? getCombos() : Promise.resolve([])])
      .then(([community, personal]) => {
        if (active) {
          setPublishedCombos(community);
          setMyCombos(personal);
        }
      })
      .catch((problem) => { if (active) setComboError(problem.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  const toggleLiked = async (comboId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setComboError('');
    try {
      const result = await toggleComboLike(comboId);
      setPublishedCombos((current) => current.map((combo) =>
        combo.id === comboId ? { ...combo, liked: result.liked, likes: result.likes } : combo
      ));
    } catch (problem) {
      setComboError(problem.message);
    }
  };
  const totalLikes = myCombos.reduce((sum, combo) => sum + Number(combo.saves || 0), 0);

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
          {user && <a href="/create" onClick={(event) => go(event, '/create')}>Create Combo</a>}
          <a href="/combos" onClick={(event) => go(event, '/combos')}>Explore</a>
          <a href="/my-combos" onClick={(event) => go(event, '/my-combos')}>My Combos</a>
        </nav>

        <div className="home-user">
          {user ? (
            <>
              <button className="icon-button" aria-label="Notifications">●</button>
              <button className="avatar" aria-label="Open profile" onClick={() => navigate('/profile')}>{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.name.charAt(0).toUpperCase()}</button>
            </>
          ) : <button className="header-login" type="button" onClick={() => navigate('/login')}>Sign in</button>}
        </div>
      </header>

      <main className="home-main">
        <section className="welcome-row">
          <div>
            <h1>{user ? `Welcome back, ${user.name.split(' ')[0]}.` : 'Welcome to HadouKraft.'}</h1>
          </div>
          <button className="create-button" onClick={() => navigate(user ? '/create' : '/login')}><span>＋</span> {user ? 'Create Combo' : 'Sign in to create'}</button>
        </section>

        <section className="feature-card">
          <img src={sf6Art} alt="Street Fighter 6 roster artwork" fetchPriority="high" />
          <div className="feature-shade" />
          <div className="feature-copy">
            <h2>Master the neutral.<br />Own the match.</h2>
            <p>Explore community-tested routes, matchup tech, and creative conversions for every fighter.</p>
            <button onClick={() => navigate('/combos')}>Explore Combos <span>→</span></button>
          </div>
        </section>

        {user && <section className="stats-grid" aria-label="Your statistics">
          <article><span className="stat-icon orange">✦</span><div><strong>{myCombos.length}</strong><span>Combos created</span></div></article>
          <article><span className="stat-icon blue">♥</span><div><strong>{totalLikes}</strong><span>Likes received</span></div></article>
        </section>}

        <section className="combo-section">
          <div className="section-heading">
            <div><h2>Trending Combos</h2></div>
            <button onClick={() => navigate('/combos')}>View all <span>→</span></button>
          </div>

          {comboError && <p className="home-combo-message error" role="alert">{comboError}</p>}
          {loading && <SkeletonLoader variant="card" count={3} />}
          {!loading && <div className="combo-grid">
            {trendingCombos.map((combo) => (
              <article className="combo-card" key={combo.id}>
                <div className="combo-top">
                  <div className={`fighter-avatar ${fighterColor(combo.character)}`}>
                    <img src={getCharacterImage(combo.character)} alt={combo.character} loading="lazy" decoding="async" width="160" height="160" />
                  </div>
                  <div><strong>{combo.character}</strong><span>by {combo.creator}</span></div>
                  <button className={combo.liked ? 'liked' : ''} onClick={() => toggleLiked(combo.id)} aria-label={user ? `${combo.liked ? 'Unlike' : 'Like'} ${combo.title}` : 'Sign in to like this combo'}>{combo.liked ? '♥' : '♡'}</button>
                </div>
                <h3>{combo.title}</h3>
                <div className="combo-inputs">{combo.notation}</div>
                <div className="combo-meta">
                  <span><small>DAMAGE</small><strong>{combo.damage || '—'}</strong></span>
                  <span><small>DIFFICULTY</small><strong>{combo.difficulty}</strong></span>
                  <span><small>LIKES</small><strong>{combo.likes}</strong></span>
                </div>
              </article>
            ))}
          </div>}
          {!loading && !comboError && trendingCombos.length === 0 && (
            <div className="home-combo-message"><strong>No published combos yet</strong><p>Publish a public combo to feature it here.</p></div>
          )}
        </section>
      </main>

      <footer className="home-footer"><span>Hadoukraft</span><small>© 2026 Hadoukraft</small></footer>
    </div>
  );
}

export default Home;
