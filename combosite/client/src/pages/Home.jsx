import "../styles/Home.css";
function Home() {
  return (
    <>
      <header>
        <nav>
          <h2>Street Fighter Combo Creator</h2>

          <ul>
            <li><a href="/login">Login</a></li>
            <li><a href="/register">Register</a></li>
          </ul>
        </nav>
      </header>

      <main>
        <section className="hero-section">
          <video
            className="hero-video"
            autoPlay
            loop
            muted
            playsInline
            poster="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80"
            src="https://www.w3schools.com/html/mov_bbb.mp4"
          />
          <div className="hero-overlay" />

          <div className="hero-copy">
            <h1>Create your own Street Fighter combos and share them with the community.</h1>

            <p>
              Build powerful combo sequences, save your favorites, and publish
              them for other players to discover, learn from, and use.
            </p>

            <div className="hero-actions">
              <button className="primary-btn">Start Creating</button>
              <button className="secondary-btn">Explore Combos</button>
            </div>
          </div>

        </section>

        <section className="info-strip">
          <article>
            <h3>Create</h3>
            <p>Design and save your own combo routes with a simple, focused experience.</p>
          </article>
          <article>
            <h3>Share</h3>
            <p>Post your best combos so the community can view, learn, and try them.</p>
          </article>
          <article>
            <h3>Grow</h3>
            <p>Build a personal library while discovering combos from other players.</p>
          </article>
        </section>
      </main>

      <footer>
        <p>© 2026 Street Fighter Combo Creator</p>

        <p>Built with React + Node.js + MongoDB</p>
      </footer>
    </>
  );
}

export default Home;