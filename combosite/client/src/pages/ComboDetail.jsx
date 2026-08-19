import { useEffect, useState } from 'react';
import { Header } from './Combos.jsx';
import { getCombo, toggleComboLike } from '../lib/api.js';
import { getCharacterImage } from '../lib/characterImages.js';
import '../styles/Home.css';
import '../styles/ComboDetail.css';

// Combo detail page: displays one public combo and its video, notation, and stats.
function ComboDetail({ navigate, user, comboId }) {
  const [combo, setCombo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getCombo(comboId).then((result) => { if (active) setCombo(result); }).catch((problem) => { if (active) setError(problem.message); });
    return () => { active = false; };
  }, [comboId]);

  const like = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const result = await toggleComboLike(combo.id);
      setCombo((current) => ({ ...current, liked: result.liked, likes: result.likes }));
    } catch (problem) {
      setError(problem.message);
    }
  };

  return (
    <div className="home-page combo-detail-page">
      <Header navigate={navigate} user={user} />
      <main className="combo-detail-main">
        {error && <div className="combo-detail-message" role="alert"><strong>Unable to open combo</strong><p>{error}</p><button type="button" onClick={() => navigate('/combos')}>Back to Explore</button></div>}
        {!error && !combo && <div className="combo-detail-message"><strong>Loading combo…</strong></div>}
        {combo && <article className="combo-detail-card">
          <div className="combo-detail-heading">
            <div className="combo-detail-fighter"><img src={getCharacterImage(combo.character)} alt={combo.character} /><div><span>{combo.game || 'Street Fighter 6'} · {combo.difficulty}</span><h1>{combo.title}</h1><button type="button" onClick={() => navigate(`/profile/${combo.userId}`)}>by {combo.creator}</button></div></div>
            <button className={combo.liked ? 'detail-like liked' : 'detail-like'} type="button" onClick={like}>{combo.liked ? '♥' : '♡'} {combo.likes}</button>
          </div>
          {combo.video?.url && <video className="combo-detail-video" controls preload="metadata" playsInline poster={getCharacterImage(combo.character)}><source src={combo.video.url} type={combo.video.type} />Your browser does not support video playback.</video>}
          <section className="combo-detail-route"><span>COMBO NOTATION</span><code>{combo.notation}</code></section>
          <div className="combo-detail-meta"><span><small>DAMAGE</small><strong>{combo.damage}</strong></span><span><small>POSITION</small><strong>{combo.position}</strong></span><span><small>METER</small><strong>{combo.meter}</strong></span></div>
          {combo.notes && <section className="combo-detail-notes"><span>NOTES</span><p>{combo.notes}</p></section>}
        </article>}
      </main>
    </div>
  );
}

export default ComboDetail;
