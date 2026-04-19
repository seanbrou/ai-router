"use client";

import { useState } from "react";

type InstallActionsProps = {
  manifestUrl: string;
  stremioDeepLink: string;
  stremioWebUrl: string;
};

export function InstallActions(props: InstallActionsProps) {
  const { manifestUrl, stremioDeepLink, stremioWebUrl } = props;
  const [copied, setCopied] = useState<"manifest" | "deeplink" | null>(null);

  async function copyValue(value: string, key: "manifest" | "deeplink") {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 2000);
  }

  function openStremioWeb() {
    window.open(stremioWebUrl, "_blank", "noopener,noreferrer");
    void copyValue(manifestUrl, "manifest");
  }

  return (
    <>
      <h2>Install Options</h2>
      <div className="ctaRow" style={{ marginTop: 16 }}>
        <a className="button primary" href={stremioDeepLink}>
          Open in Stremio App
        </a>
        <button className="button ghost" type="button" onClick={openStremioWeb}>
          Open Stremio Web + Copy Manifest
        </button>
        <button className="button ghost" type="button" onClick={() => void copyValue(manifestUrl, "manifest")}>
          {copied === "manifest" ? "Manifest Copied" : "Copy Manifest URL"}
        </button>
      </div>
      <div className="ctaRow" style={{ marginTop: 12 }}>
        <button className="button ghost" type="button" onClick={() => void copyValue(stremioDeepLink, "deeplink")}>
          {copied === "deeplink" ? "Deep Link Copied" : "Copy Stremio Deep Link"}
        </button>
      </div>
      <p style={{ marginTop: 16 }}>
        If you use Stremio Web, open the add-ons page there and paste the manifest URL below.
      </p>
    </>
  );
}
