import AuthLayout from '../components/AuthLayout.jsx';
import sf6 from '../assets/sf6.jpg';
import '../styles/Login.css';

function Login({ navigate }) {
  return (
    <AuthLayout
      heroHeading="Log in and pick up where your best matches left off."
      heroParagraph="Save your favorite sequences, follow creators, and keep your training routine moving."
      heroImage={sf6}
      cardHeading="Welcome back"
      cardDescription="Sign in to your account and continue building."
    >
      <form className="login-form">
        <label className="login-label">
          Email
          <input type="email" placeholder="Enter your email" />
        </label>

        <label className="login-label">
          Password
          <input type="password" placeholder="Enter your password" />
        </label>

        <div className="login-options">
          <label>
            <input type="checkbox" /> Remember me
          </label>
          <a href="#">Forgot password?</a>
        </div>

        <button type="submit" className="login-btn">Log In</button>
      </form>

      <p className="login-link-row">
        New here? <a href="/register" onClick={(event) => { event.preventDefault(); navigate('/register'); }}>Create an account</a>
      </p>
    </AuthLayout>
  );
}

export default Login;
