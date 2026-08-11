import { useEffect, useMemo, useState } from 'react';
import { Header } from './Combos.jsx';
import '../styles/Home.css';
import '../styles/Library.css';
import { deleteCombo, getCombos } from '../lib/api.js';
import { getCharacterImage } from '../lib/characterImages.js';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

const fighterColor = (fighter) => {
  if (['Ken', 'Marisa', 'Dhalsim'].includes(fighter)) return 'orange';
  if (['Juri', 'A.K.I.', 'M. Bison'].includes(fighter)) return 'purple';
  if (['Luke', 'Chun-Li', 'Guile'].includes(fighter)) return 'blue';
  return 'red';
};

const relativeDate = (date) => {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

function MyCombos({ navigate, user }) {
  const [personalCombos, setPersonalCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState('All');
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState(null);
  const [actionError, setActionError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const prepareVideo = (event) => {
    const video = event.currentTarget;
    video.defaultMuted = false;
    video.muted = false;
    video.volume = 1;
    if (video.currentTime === 0 && Number.isFinite(video.duration) && video.duration > 0.01) video.currentTime = 0.01;
  };
  const combos = useMemo(() => personalCombos.filter((combo) => {
    const tabMatch = tab === 'All' || combo.status === tab;
    return tabMatch && `${combo.character} ${combo.title}`.toLowerCase().includes(query.toLowerCase());
  }), [personalCombos, tab, query]);

  const refreshCombos = async () => {
    try {
      setLoadError('');
      setPersonalCombos(await getCombos());
    } catch (problem) {
      setLoadError(problem.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    getCombos()
      .then((result) => { if (active) setPersonalCombos(result); })
      .catch((problem) => { if (active) setLoadError(problem.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const remove = async (combo) => {
    setDeleting(true);
    try {
      setActionError('');
      await deleteCombo(combo.id);
      await refreshCombos();
      setMenu(null);
      setPendingDelete(null);
    } catch (problem) {
      setActionError(problem.message);
    } finally {
      setDeleting(false);
    }
  };

  const publishedCount = personalCombos.filter((combo) => combo.status === 'Published').length;
  const draftCount = personalCombos.filter((combo) => combo.status === 'Draft').length;
  const totalSaves = personalCombos.reduce((sum, combo) => sum + Number(combo.saves || 0), 0);

  return (
    <div className="home-page library-page">
      <ConfirmDialog open={Boolean(pendingDelete)} title="Delete this combo?" message={pendingDelete ? `“${pendingDelete.title}” will be removed from your library and Explore. This action cannot be undone.` : ''} confirmLabel="Delete Combo" busy={deleting} danger onConfirm={() => remove(pendingDelete)} onCancel={() => setPendingDelete(null)} />
      <Header navigate={navigate} active="mine" user={user} />
      <main className="library-main">
        <section className="library-heading my-heading">
          <div><h1>My combos</h1></div>
          <button className="create-button" onClick={() => navigate('/create')} type="button"><span>＋</span> Create Combo</button>
        </section>
        <section className="mini-stats">
          <article><span className="stat-icon orange">✦</span><div><small>TOTAL COMBOS</small><strong>{personalCombos.length}</strong></div></article>
          <article><span className="stat-icon purple">♥</span><div><small>TOTAL SAVES</small><strong>{totalSaves.toLocaleString()}</strong></div></article>
        </section>
        <section className="my-library-panel">
          <div className="my-toolbar">
            <div className="library-tabs">
              {['All', 'Published', 'Draft'].map((item) => <button className={tab === item ? 'active' : ''} onClick={() => setTab(item)} type="button" key={item}>{item}<span>{item === 'All' ? personalCombos.length : item === 'Published' ? publishedCount : draftCount}</span></button>)}
            </div>
            <label className="search-box small"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your combos..." /></label>
          </div>
          <div className="my-combo-list">
            {loading && <SkeletonLoader variant="row" count={5} />}
            {loadError && <p className="library-message error" role="alert">{loadError}</p>}
            {actionError && <p className="library-message error" role="alert">{actionError}</p>}
            {!loading && combos.map((combo) => (
              <article className="my-combo-row" key={combo.id}>
                <div className={`fighter-avatar ${fighterColor(combo.character)}`}>
                  <img src={getCharacterImage(combo.character)} alt={combo.character} loading="lazy" decoding="async" width="160" height="160" />
                </div>
                <div className="my-combo-info"><div><span>{combo.character} · SF6</span><i className={combo.status.toLowerCase()}>{combo.status}</i></div><h2>{combo.title}</h2><code>{combo.notation}</code></div>
                <div className="my-combo-number"><small>DAMAGE</small><strong>{combo.damage}</strong></div>
                <div className="updated"><small>UPDATED</small><span>{relativeDate(combo.updatedAt)}</span></div>
                <div className="row-menu-wrap"><button className="row-menu" onClick={() => setMenu(menu === combo.id ? null : combo.id)} type="button" aria-label={`Actions for ${combo.title}`}>•••</button>{menu === combo.id && <div className="menu-popover"><button type="button" onClick={() => navigate(`/combos/${encodeURIComponent(combo.id)}/edit`)}>Edit</button><button className="delete-action" type="button" onClick={() => setPendingDelete(combo)}>Delete</button></div>}</div>
                {combo.video?.url && (
                  <video className="my-combo-video" controls preload="metadata" playsInline onLoadedMetadata={prepareVideo}>
                    <source src={combo.video.url} type={combo.video.type} />
                    Your browser does not support video playback.
                  </video>
                )}
              </article>
            ))}
          </div>
          {!loading && !loadError && combos.length === 0 && <div className="empty-results"><strong>No combos here yet</strong><p>Try a different search or create a new combo.</p></div>}
          <div className="library-footer"><span>Showing {combos.length} of {personalCombos.length} combos</span></div>
        </section>
      </main>
    </div>
  );
}

export default MyCombos;
