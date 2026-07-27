import { useEffect, useState } from 'react';
import '../styles/Home.css';
import '../styles/Create.css';
import { saveCombo, uploadVideo } from '../lib/api.js';
import { getCharacterImage } from '../lib/characterImages.js';

const initialForm = {
  character: '',
  title: '',
  difficulty: 'Intermediate',
  notation: '',
  damage: '',
  position: 'Midscreen',
  meter: 'No meter',
  notes: '',
  visibility: 'Public',
};

const sf6Characters = [
  'A.K.I.', 'Akuma', 'Alex', 'Blanka', 'C. Viper', 'Cammy', 'Chun-Li', 'Dee Jay',
  'Dhalsim', 'Ed', 'Elena', 'E. Honda', 'Guile', 'Ingrid', 'J.P.', 'Jamie', 'Juri',
  'Ken', 'Kimberly', 'Lily', 'Luke', 'M. Bison', 'Mai', 'Manon', 'Marisa',
  'Rashid', 'Ryu', 'Sagat', 'Terry', 'Zangief',
];

function Create({ navigate, user }) {
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [video, setVideo] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [characterQuery, setCharacterQuery] = useState('');
  const [characterOpen, setCharacterOpen] = useState(false);
  const [characterError, setCharacterError] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
  }, [videoPreviewUrl]);

  const go = (event, path) => {
    event.preventDefault();
    navigate(path);
  };

  const updateField = ({ target }) => {
    setSubmitted(false);
    setForm((current) => ({ ...current, [target.name]: target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    if (!form.character) {
      setCharacterError(true);
      setCharacterOpen(true);
      return;
    }
    const confirmed = window.confirm(
      `Publish "${form.title.trim()}" as a ${form.visibility.toLowerCase()} combo?`,
    );
    if (!confirmed) return;

    try {
      const uploadedVideo = video ? await uploadVideo(video) : null;
      await saveCombo({
        ...form,
        status: 'Published',
        video: uploadedVideo,
      });
      setSubmitted(true);
      window.setTimeout(() => navigate('/my-combos'), 650);
    } catch (problem) {
      setSubmitError(problem.message);
    }
  };

  const matchingCharacters = sf6Characters.filter((character) =>
    character.toLowerCase().includes(characterQuery.toLowerCase()),
  );

  const selectCharacter = (character) => {
    setForm((current) => ({ ...current, character }));
    setCharacterQuery(character);
    setCharacterError(false);
    setCharacterOpen(false);
  };

  const selectVideo = (file) => {
    setVideoError('');
    if (!file) {
      setVideo(null);
      setVideoPreviewUrl('');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setVideo(null);
      setVideoPreviewUrl('');
      setVideoError('Video must be 100 MB or smaller.');
      return;
    }
    setVideo(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
  };

  return (
    <div className="home-page create-page">
      <header className="home-header">
        <a className="home-brand" href="/home" onClick={(event) => go(event, '/home')}>
          <span className="brand-mark">HK</span>
          <span>Hadou<span>Kraft</span></span>
        </a>

        <nav className="home-nav" aria-label="Main navigation">
          <a href="/home" onClick={(event) => go(event, '/home')}>Home</a>
          <a href="/combos" onClick={(event) => go(event, '/combos')}>Explore</a>
          <a className="active" href="/my-combos" onClick={(event) => go(event, '/my-combos')}>My Combos</a>
        </nav>

        <div className="home-user">
          <button className="icon-button" type="button" aria-label="Notifications">●</button>
          <button className="avatar" type="button" aria-label="Open profile" onClick={() => navigate('/profile')}>{user.name.charAt(0).toUpperCase()}</button>
        </div>
      </header>

      <main className="create-main">
        <div className="create-heading">
          <div>
            <h1>Create a new combo</h1>
          </div>
          <span className="draft-status"><i /> Draft</span>
        </div>

        <form className="combo-form" onSubmit={submit}>
          <section className="form-panel form-primary">
            <div className="panel-heading">
              <span>01</span>
              <div><h2>Combo details</h2></div>
            </div>

            <div className="form-grid">
              <label>Character
                <div className="character-picker">
                  <span className="character-search" aria-hidden="true">⌕</span>
                  <input
                    value={characterQuery}
                    onChange={(event) => {
                      setCharacterQuery(event.target.value);
                      setForm((current) => ({ ...current, character: '' }));
                      setCharacterError(false);
                      setCharacterOpen(true);
                    }}
                    onFocus={() => setCharacterOpen(true)}
                    onBlur={() => window.setTimeout(() => setCharacterOpen(false), 150)}
                    placeholder="Search for a character..."
                    aria-expanded={characterOpen}
                    aria-controls="character-options"
                    aria-invalid={characterError}
                    autoComplete="off"
                  />
                  <span className="picker-chevron" aria-hidden="true">⌄</span>
                  {characterOpen && (
                    <div className="character-options" id="character-options" role="listbox">
                      {matchingCharacters.length ? matchingCharacters.map((character) => (
                        <button
                          className={form.character === character ? 'selected' : ''}
                          type="button"
                          role="option"
                          aria-selected={form.character === character}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectCharacter(character)}
                          key={character}
                        >
                          <span className="character-option-image">
                            <img src={getCharacterImage(character)} alt={character} loading="lazy" decoding="async" width="160" height="160" />
                          </span>
                          {character}
                          {form.character === character && <b>✓</b>}
                        </button>
                      )) : <p>No character found</p>}
                    </div>
                  )}
                </div>
                {characterError && <small className="field-error">Choose a character from the list.</small>}
              </label>
              <label className="wide">Combo title
                <input name="title" value={form.title} onChange={updateField} placeholder="e.g. Corner carry punish" required />
              </label>
              <label>Difficulty
                <select name="difficulty" value={form.difficulty} onChange={updateField}>
                  <option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>Expert</option>
                </select>
              </label>
              <label>Damage
                <div className="input-suffix"><input name="damage" value={form.damage} onChange={updateField} inputMode="numeric" placeholder="3420" /><span>DMG</span></div>
              </label>
            </div>
          </section>

          <section className="form-panel form-route">
            <div className="panel-heading">
              <span>02</span>
              <div><h2>Input notation</h2></div>
            </div>
            <label>Combo sequence
              <textarea name="notation" value={form.notation} onChange={updateField} placeholder="2MP  ·  5HP  ·  DR  ·  5HP  ·  623HP" required />
              <small>Tip: separate inputs with a dot or comma for easier reading.</small>
            </label>
            <div className="notation-help"><strong>Quick notation</strong><span>2 = Down</span><span>5 = Neutral</span><span>6 = Forward</span><span>DR = Drive Rush</span></div>
          </section>

          <section className="form-panel form-setup">
            <div className="panel-heading">
              <span>03</span>
              <div><h2>Setup & notes</h2></div>
            </div>
            <div className="form-grid">
              <label>Screen position
                <select name="position" value={form.position} onChange={updateField}><option>Midscreen</option><option>Corner</option><option>Anywhere</option></select>
              </label>
              <label>Resource use
                <select name="meter" value={form.meter} onChange={updateField}><option>No meter</option><option>1 bar</option><option>2 bars</option><option>3+ bars</option></select>
              </label>
              <label className="wide">Training notes <span className="optional">OPTIONAL</span>
                <textarea className="notes-field" name="notes" value={form.notes} onChange={updateField} placeholder="Timing tips, counter-hit requirements, matchup notes..." />
              </label>
            </div>
          </section>

          <section className="form-panel form-video">
            <div className="panel-heading">
              <span>04</span>
              <div><h2>Combo video <span className="optional">OPTIONAL</span></h2></div>
            </div>
            <label className={`video-dropzone ${video ? 'has-video' : ''}`}>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(event) => selectVideo(event.target.files?.[0] ?? null)}
              />
              <span className="video-icon">{video ? '✓' : '▶'}</span>
              <span className="video-copy">
                <strong>{video ? video.name : 'Choose a combo video'}</strong>
                <small>{video ? `${(video.size / 1024 / 1024).toFixed(1)} MB · Ready to attach` : 'MP4, WebM, or MOV · Up to 100 MB'}</small>
              </span>
              <span className="browse-video">{video ? 'Replace' : 'Browse file'}</span>
            </label>
            {videoPreviewUrl && (
              <div className="video-preview-wrap">
                <video className="video-preview" src={videoPreviewUrl} controls preload="metadata">
                  Your browser does not support video playback.
                </video>
                <small>Play the preview and check the volume control to confirm your file contains a browser-compatible audio track.</small>
              </div>
            )}
            {videoError && <p className="video-error" role="alert">{videoError}</p>}
            {video && <button className="remove-video" type="button" onClick={() => { setVideo(null); setVideoPreviewUrl(''); }}>Remove attachment</button>}
          </section>

          <aside className="publish-panel">
            <div><p className="eyebrow">READY TO SHARE?</p><h2>Publish your combo</h2></div>
            <label>Visibility
              <select name="visibility" value={form.visibility} onChange={updateField}><option>Public</option><option>Private</option></select>
            </label>
            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={() => navigate('/home')}>Cancel</button>
              <button type="submit" className="publish-button">Publish Combo <span>→</span></button>
            </div>
            {submitted && <p className="success-message" role="status">Combo ready — your form was submitted.</p>}
            {submitError && <p className="publish-error" role="alert">{submitError}</p>}
          </aside>
        </form>
      </main>
    </div>
  );
}

export default Create;
