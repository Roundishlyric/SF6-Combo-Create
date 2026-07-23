import { useState } from 'react';
import AuthLayout from '../components/AuthLayout.jsx';

function Register({ navigate, onRegister }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      await onRegister(form);
    } catch (problem) {
      setError(problem.message);
    }
  };

  return (
    <AuthLayout
      heroHeading="Create your account and start adding combos today."
      heroParagraph="Be part of the community, save your favorite sets, and keep your progress consistent."
      cardHeading="Create your account"
      cardDescription="Sign up to save combos, track progress, and access your personalized dashboard."
    >
      <form className="register-form" onSubmit={submit}>
        <label className="register-label">
          Full name
          <input name="name" value={form.name} onChange={update} type="text" autoComplete="name" placeholder="Enter your full name" required />
        </label>

        <label className="register-label">
          Email
          <input name="email" value={form.email} onChange={update} type="email" autoComplete="email" placeholder="Enter your email" required />
        </label>

        <label className="register-label">
          Password
          <input name="password" value={form.password} onChange={update} type="password" autoComplete="new-password" placeholder="Create a password" minLength="6" required />
        </label>

        <label className="register-label">
          Confirm password
          <input name="confirmPassword" value={form.confirmPassword} onChange={update} type="password" autoComplete="new-password" placeholder="Confirm your password" minLength="6" required />
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
