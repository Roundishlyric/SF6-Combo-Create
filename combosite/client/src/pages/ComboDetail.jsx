import { useEffect, useState } from 'react';
import { Header } from './Combos.jsx';
import { getCombo, getComboComments, postComboComment, toggleComboLike } from '../lib/api.js';
import { getCharacterImage } from '../lib/characterImages.js';
import ComboVideo from '../components/ComboVideo.jsx';
import '../styles/Home.css';
import '../styles/ComboDetail.css';

// Combo detail page: displays one public combo and its video, notation, and stats.
function ComboComments({ comboId, user, navigate }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let active = true;
    getComboComments(comboId).then((items) => {
      if (active) setComments(items);
    }).catch((problem) => {
      if (active) setError(problem.message);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [comboId]);

  const submit = async (event) => {
    event.preventDefault();
    if (posting || loading || !draft.trim()) return;
    setPosting(true);
    setError('');
    try {
      const comment = await postComboComment(comboId, draft);
      setComments((current) => [comment, ...current].slice(0, 100));
      setDraft('');
    } catch (problem) {
      setError(problem.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <section className="combo-comments" aria-labelledby="comments-heading">
      <h2 id="comments-heading">Comments</h2>
      {user ? <form onSubmit={submit}>
        <label htmlFor="combo-comment">Add a comment</label>
        <textarea id="combo-comment" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} required rows={3} placeholder="Share a tip or ask about this combo..." disabled={posting} />
        <div className="comment-form-footer"><small>{draft.length}/1000</small><button type="submit" disabled={posting || loading || !draft.trim()}>{posting ? 'Posting...' : 'Post comment'}</button></div>
      </form> : <p><button type="button" onClick={() => navigate('/login')}>Sign in</button> to join the discussion.</p>}
      {error && <p className="comment-error" role="alert">{error}</p>}
      {loading ? <p role="status">Loading comments...</p> : <>
        {!comments.length && !error && <p>No comments yet. Start the discussion!</p>}
        <ul className="comment-list">{comments.map((comment) => <li key={comment.id}>
          <div className="comment-heading"><strong>{comment.author}</strong><time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time></div>
          <p>{comment.body}</p>
        </li>)}</ul>
        {comments.length === 100 && <small>Showing the latest 100 comments.</small>}
      </>}
    </section>
  );
}

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
          {combo.video?.url && <ComboVideo className="combo-detail-video" video={combo.video} title={combo.title} />}
          <section className="combo-detail-route"><span>COMBO NOTATION</span><code>{combo.notation}</code></section>
          <div className="combo-detail-meta"><span><small>DAMAGE</small><strong>{combo.damage}</strong></span><span><small>POSITION</small><strong>{combo.position}</strong></span><span><small>METER</small><strong>{combo.meter}</strong></span></div>
          {combo.notes && <section className="combo-detail-notes"><span>NOTES</span><p>{combo.notes}</p></section>}
          {combo.status === 'Published' && combo.visibility === 'Public' && <ComboComments key={combo.id} comboId={combo.id} user={user} navigate={navigate} />}
        </article>}
      </main>
    </div>
  );
}

export default ComboDetail;
