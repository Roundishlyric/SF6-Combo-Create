import { useState } from 'react';
import AuthLayout from '../components/AuthLayout.jsx';
import sf6 from '../assets/sf6.jpg';
import '../styles/Login.css';

function Login({ navigate, onLogin }) {
  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onLogin(form);
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
      cardHeading="Welcome back"
      cardDescription="Sign in to your account and continue building."
    >
      <form className="login-form" onSubmit={submit}>
        <label className="login-label">
          Email
          <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" placeholder="Enter your email" required />
        </label>

        <label className="login-label">
          Password
          <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="current-password" placeholder="Enter your password" required />
        </label>

        <div className="login-options">
          <label className="remember-control">
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(event) => setForm({ ...form, remember: event.target.checked })}
            />
            <span className="remember-box" aria-hidden="true">✓</span>
            <span>Remember me</span>
          </label>
          <a href="#" onClick={(event) => event.preventDefault()}>Forgot password?</a>
        </div>

        <button type="submit" className="login-btn" disabled={submitting}>
          {submitting ? <><span className="login-spinner" /> Signing in…</> : 'Log In'}
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
