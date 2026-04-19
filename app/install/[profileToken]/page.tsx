import { headers } from "next/headers";

type InstallPageProps = {
  params: Promise<{
    profileToken: string;
  }>;
};

export default async function InstallPage({ params }: InstallPageProps) {
  const { profileToken } = await params;
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || `${protocol}://${host}`;
  const manifestUrl = `${baseUrl}/api/stremio/${profileToken}/manifest.json`;
  const stremioDeepLink = `stremio://${manifestUrl.replace(/^https?:\/\//, "")}`;

  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">Install</div>
        <h1>Install your AI Sorter add-on</h1>
        <p>
          Use the manifest URL below in Stremio, or open the deep link on devices that support it.
        </p>
      </section>

      <section className="panel" style={{ marginTop: 24 }}>
        <h2>Manifest URL</h2>
        <p className="code">{manifestUrl}</p>
        <h2 style={{ marginTop: 24 }}>Deep Link</h2>
        <p className="code">{stremioDeepLink}</p>
      </section>
    </main>
  );
}
