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
    const url = `${stremioWebUrl}?addon=${encodeURIComponent(manifestUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    void copyValue(manifestUrl, "manifest");
  }

  function openStremioApp() {
    window.open(stremioDeepLink, "_self");
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(manifestUrl)}`;

  return (
    <>
      <div className="installGrid">
        <div className="qrWrap">
          <img src={qrUrl} alt="QR code for manifest URL" className="qrImg" />
          <p className="qrLabel">Scan to install on mobile / TV</p>
        </div>

        <div className="actionsWrap">
          <h3>One-click install</h3>
          <div className="ctaCol">
            <button className="button primary" type="button" onClick={openStremioWeb}>
              Add to Stremio Web
            </button>
            <button className="button primary" type="button" onClick={openStremioApp}>
              Open in Stremio App
            </button>
            <button
              className="button ghost"
              type="button"
              onClick={() => void copyValue(manifestUrl, "manifest")}
            >
              {copied === "manifest" ? "Manifest Copied ✓" : "Copy Manifest URL"}
            </button>
            <button
              className="button ghost"
              type="button"
              onClick={() => void copyValue(stremioDeepLink, "deeplink")}
            >
              {copied === "deeplink" ? "Deep Link Copied ✓" : "Copy Deep Link"}
            </button>
          </div>
        </div>
      </div>

      <div className="manifestBox" style={{ marginTop: 20 }}>
        <h3>Manifest URL</h3>
        <code className="codeBlock">{manifestUrl}</code>
      </div>
    </>
  );
}
