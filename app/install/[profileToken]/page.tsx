import { headers } from "next/headers";
import { InstallActions } from "./install-actions";

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
  const stremioWebUrl = "https://web.strem.io/#/addons";

  return (
    <main className="shell">
      <section className="hero compact">
        <div className="eyebrow">Install</div>
        <h1>Install your AI Sorter add-on</h1>
        <p>
          Choose the easiest method below. The manifest URL is all Stremio needs to load your
          personalized streams.
        </p>
      </section>

      <section className="panel installPanel" style={{ marginTop: 24 }}>
        <InstallActions
          manifestUrl={manifestUrl}
          stremioDeepLink={stremioDeepLink}
          stremioWebUrl={stremioWebUrl}
        />
      </section>
    </main>
  );
}
