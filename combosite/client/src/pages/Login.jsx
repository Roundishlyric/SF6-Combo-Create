import { useState } from 'react';
import AuthLayout from '../components/AuthLayout.jsx';
import sf6 from '../assets/sf6-optimized.jpg';
import '../styles/Login.css';

// Login page: collects credentials and starts a browser session.
function Login({ navigate, onLogin }) {
  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const email = form.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !form.password) {
      setError('Enter a valid email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await onLogin({ ...form, email });
    } catch (problem) {
      setError(problem.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      heroHeading="Log in and pick up where your best matches left off."
      heroParagraph="Save your favorite sequences, follow creators, and keep your training routine moving."
      heroImage={sf6}
      cardHeading={<>Welcome Back<span className="login-heading-cursor" aria-hidden="true">_</span></>}
    >
      <form className="login-form" onSubmit={submit}>
        <label className="login-label">
          Email
          <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" placeholder="Enter your email" maxLength="254" required />
        </label>

        <label className="login-label">
          Password
          <span className="password-field">
            <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="current-password" placeholder="Enter your password" required />
            <button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={`${showPassword ? 'Hide' : 'Show'} password`} aria-pressed={showPassword}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                <circle cx="12" cy="12" r="3" />
                {showPassword && <path d="m4 4 16 16" />}
              </svg>
            </button>
          </span>
        </label>

        <div className="login-options">
          <label className="remember-control">
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(event) => setForm({ ...form, remember: event.target.checked })}
            />
            <span className="remember-box" aria-hidden="true">{'\u2713'}</span>
            <span>Remember me</span>
          </label>
        </div>

        <button type="submit" className="login-btn" disabled={submitting}>
          {submitting ? <><span className="login-spinner" /> Signing in...</> : 'Log In'}
        </button>
        {error && <p className="auth-error" role="alert">{error}</p>}
      </form>

      <p className="login-link-row">
        New here? <a href="/register" onClick={(event) => { event.preventDefault(); navigate('/register'); }}>Create an account</a>
      </p>
    </AuthLayout>
  );
}

export default Login;
