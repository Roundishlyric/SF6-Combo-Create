import '../styles/Login.css';

function AuthLayout({ heroHeading, heroParagraph, heroImage, cardHeading, cardDescription, children }) {
  return (
    <div className="login-page">
      <div className="login-shell">
        <section
          className={`login-hero${heroImage ? ' login-hero--image' : ''}`}
        >
          {heroImage && <img className="login-hero-art" src={heroImage} alt="" />}
          <div>
            <h1>{heroHeading}</h1>
            {heroParagraph && <p>{heroParagraph}</p>}
          </div>
        </section>

        <section className="login-card">
          <a className="login-brand" href="/home">
            <img src="/logo%20no%20bg.png" alt="" width="52" height="52" />
            <span>HadouKraft</span>
          </a>
          <h2>{cardHeading}</h2>
          {cardDescription && <p>{cardDescription}</p>}
          {children}
        </section>
      </div>
    </div>
  );
}

export default AuthLayout;
