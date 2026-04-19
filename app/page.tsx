import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">
          <span className="eyebrowDot" />
          AI-Powered Stremio Add-on
        </div>
        <h1>AI Stream Sorter</h1>
        <p>
          Rank and sort your Stremio streams with AI. Set up your preferences in minutes — no coding required.
        </p>
        <div className="ctaRow">
          <Link className="button primary" href="/configure">
            Get Started →
          </Link>
        </div>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>
            <span className="panelIcon">🎯</span> How It Works
          </h2>
          <ul className="list">
            <li>Pick your quality, language, and codec preferences</li>
            <li>Add your Stremio add-on providers</li>
            <li>Install the generated URL into Stremio</li>
            <li>AI ranks every stream to match your taste</li>
          </ul>
        </article>

        <article className="panel">
          <h2>
            <span className="panelIcon">✨</span> Features
          </h2>
          <ul className="list">
            <li>Multi-provider support (Torrentio, Debridio, custom)</li>
            <li>AI-powered stream ranking with Gemini</li>
            <li>Quality-first, speed-first, or balanced modes</li>
            <li>Debrid and cached stream prioritization</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
