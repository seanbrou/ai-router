import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">Standalone Repo Ready</div>
        <h1>AI Sorter is now scaffolded as its own Stremio add-on workspace.</h1>
        <p>
          This repo is intentionally separate from the parent <span className="code">C:\Oat</span>
          {" "}project. It contains only the web app, API routes, and Convex scaffold for the
          Gemini-powered Stremio add-on.
        </p>
        <div className="ctaRow">
          <Link className="button primary" href="/configure">
            Open Configure Page
          </Link>
          <Link className="button secondary" href="/configure">
            Create Install Link
          </Link>
        </div>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>Included Now</h2>
          <ul className="list">
            <li>Next.js App Router project root</li>
            <li>Vercel-compatible Stremio endpoint skeletons</li>
            <li>Convex schema scaffold for add-on data</li>
            <li>Independent env contract and README</li>
          </ul>
        </article>
        <article className="panel">
          <h2>Still To Build</h2>
          <ul className="list">
            <li>Provider adapters for Torrentio, Debridio, and custom addons</li>
            <li>Gemini ranking pipeline</li>
            <li>Profile management UI and persistence</li>
            <li>Install-token backed manifest generation</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
