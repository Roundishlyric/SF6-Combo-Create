import AuthLayout from '../components/AuthLayout.jsx';

function Register({ navigate }) {
  return (
    <AuthLayout
      heroHeading="Create your account and start adding combos today."
      heroParagraph="Be part of the community, save your favorite sets, and keep your progress consistent."
      cardHeading="Create your account"
      cardDescription="Sign up to save combos, track progress, and access your personalized dashboard."
    >
      <form className="register-form">
        <label className="register-label">
          Full name
          <input name="name" type="text" autoComplete="name" placeholder="Enter your full name" />
        </label>

        <label className="register-label">
          Email
          <input name="email" type="email" autoComplete="email" placeholder="Enter your email" />
        </label>

        <label className="register-label">
          Password
          <input name="password" type="password" autoComplete="new-password" placeholder="Create a password" />
        </label>

        <label className="register-label">
          Confirm password
          <input name="confirmPassword" type="password" autoComplete="new-password" placeholder="Confirm your password" />
        </label>

        <div className="login-options">
          <label>
            <input type="checkbox" /> I agree to the terms and privacy policy
          </label>
        </div>

        <button type="submit" className="register-btn">Create account</button>
      </form>

      <p className="register-link-row">
        Already have an account? <a href="/login" onClick={(event) => { event.preventDefault(); navigate('/login'); }}>Log in</a>
      </p>
    </AuthLayout>
  );
}

export default Register;
