import { useState } from 'react';
import AuthLayout from '../components/AuthLayout.jsx';

// Registration page: validates details and creates a new account.
function Register({ navigate, onRegister }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (name.length < 2 || name.length > 60) {
      setError('Name must be between 2 and 60 characters.');
      return;
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (form.password.length < 8 || !/[a-z]/.test(form.password) || !/[A-Z]/.test(form.password) || !/\d/.test(form.password)) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, and a number.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      await onRegister({ ...form, name, email });
    } catch (problem) {
      setError(problem.message);
    }
  };

  return (
    <AuthLayout
      heroHeading="Create your account and start adding combos today."
      heroParagraph="Be part of the community, save your favorite sets, and keep your progress consistent."
      heroImage="/images/luke.jpg"
      cardHeading={<>Create Your Account<span className="login-heading-cursor" aria-hidden="true">_</span></>}
      cardDescription="Sign up to save combos, track progress, and access your personalized dashboard."
    >
      <form className="register-form" onSubmit={submit}>
        <label className="register-label">
          Full name
          <input name="name" value={form.name} onChange={update} type="text" autoComplete="name" placeholder="Enter your full name" minLength="2" maxLength="60" required />
        </label>

        <label className="register-label">
          Email
          <input name="email" value={form.email} onChange={update} type="email" autoComplete="email" placeholder="Enter your email" maxLength="254" required />
        </label>

        <label className="register-label">
          Password
          <span className="password-field">
            <input name="password" value={form.password} onChange={update} type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="8+ characters, upper, lower, number" minLength="8" maxLength="128" required />
            <button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={`${showPassword ? 'Hide' : 'Show'} password`} aria-pressed={showPassword}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                <circle cx="12" cy="12" r="3" />
                {showPassword && <path d="m4 4 16 16" />}
              </svg>
            </button>
          </span>
        </label>

        <label className="register-label">
          Confirm password
          <span className="password-field">
            <input name="confirmPassword" value={form.confirmPassword} onChange={update} type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Confirm your password" minLength="8" maxLength="128" required />
            <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={`${showConfirmPassword ? 'Hide' : 'Show'} confirmation password`} aria-pressed={showConfirmPassword}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                <circle cx="12" cy="12" r="3" />
                {showConfirmPassword && <path d="m4 4 16 16" />}
              </svg>
            </button>
          </span>
        </label>

        <div className="login-options">
          <label>
            <input type="checkbox" required /> I agree to the terms and privacy policy
          </label>
        </div>

        <button type="submit" className="register-btn">Create account</button>
        {error && <p className="auth-error" role="alert">{error}</p>}
      </form>

      <p className="register-link-row">
        Already have an account? <a href="/login" onClick={(event) => { event.preventDefault(); navigate('/login'); }}>Log in</a>
      </p>
    </AuthLayout>
  );
}

export default Register;
