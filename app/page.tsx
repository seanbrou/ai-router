import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell">
      <header className="topBar">
        <div className="topBarInner">
          <span className="logo">
            <span className="logoMark">◆</span>
            AI Sorter
          </span>
          <span className="version">v1.0</span>
        </div>
      </header>

      <section className="hero">
        <div className="badge">
          <span className="badgeDot" />
          Stremio Add-on
        </div>
        <h1>Rank your streams with AI</h1>
        <p>
          Set up your preferences, add your providers, and install a personal Stremio add-on
          that sorts every stream to match your taste.
        </p>
        <div className="ctaRow">
          <Link className="button primary" href="/configure">
            Get started →
          </Link>
        </div>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>How it works</h2>
          <ul className="list">
            <li>Pick quality, language, and codec preferences</li>
            <li>Add Stremio add-on providers (Torrentio, Debridio, etc.)</li>
            <li>Save to generate your personal add-on URL</li>
            <li>Install the URL into Stremio on any device</li>
          </ul>
        </article>

        <article className="panel">
          <h2>Features</h2>
          <ul className="list">
            <li>Multi-provider support with priority ordering</li>
            <li>Gemini-powered AI stream ranking</li>
            <li>Quality-first, speed-first, or balanced modes</li>
            <li>Debrid and cached stream prioritization</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
