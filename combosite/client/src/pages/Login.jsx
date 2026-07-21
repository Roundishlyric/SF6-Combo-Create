import '../styles/Login.css';

function Login() {
  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-hero">
          <div>
            <h1>Log in and pick up where your best matches left off.</h1>
            <p>
              Save your favorite sequences, follow creators, and keep your training routine moving.
            </p>
          </div>
        </section>

        <section className="login-card">
          <h2>Welcome back</h2>
          <p>Sign in to your account and continue building.</p>

          <form className="login-form">
            <label>
              Email
              <input type="email" placeholder="Enter your email" />
            </label>

            <label>
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
            New here? <a href="/register">Create an account</a>
          </p>
        </section>
      </div>
    </div>
  );
}

export default Login;
