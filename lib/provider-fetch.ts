import { ProviderDraft } from "./types";

type RawStream = Record<string, unknown>;

function isPrivateHostname(hostname: string) {
  const lower = hostname.toLowerCase();
  if (
    lower === "localhost" ||
    lower === "::1" ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal")
  ) {
    return true;
  }

  if (/^\d+\.\d+\.\d+\.\d+$/.test(lower)) {
    if (
      lower.startsWith("10.") ||
      lower.startsWith("127.") ||
      lower.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(lower)
    ) {
      return true;
    }
  }

  return false;
}

export function assertSafeManifestUrl(manifestUrl: string) {
  const url = new URL(manifestUrl);
  if (url.protocol !== "https:") {
    throw new Error("Provider manifest URLs must use HTTPS.");
  }

  if (isPrivateHostname(url.hostname)) {
    throw new Error("Private or local provider hosts are not allowed.");
  }

  if (!/\/manifest\.json$/i.test(url.pathname)) {
    throw new Error("Provider manifest URLs must end with /manifest.json.");
  }

  return url;
}

export function manifestUrlToStreamUrl(manifestUrl: string, type: string, id: string) {
  const normalized = assertSafeManifestUrl(manifestUrl).toString().replace(/\/+$/, "");
  if (!normalized) {
    throw new Error("Manifest URL is required.");
  }

  const streamPath = `/stream/${encodeURIComponent(type)}/${encodeURIComponent(id)}.json`;
  if (normalized.endsWith("/manifest.json")) {
    return normalized.replace(/\/manifest\.json$/i, streamPath);
  }

  if (normalized.endsWith("manifest.json")) {
    return normalized.replace(/manifest\.json$/i, streamPath.slice(1));
  }

  return `${normalized}${streamPath}`;
}

async function fetchJsonWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Provider responded with ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchProviderStreams(provider: ProviderDraft, type: string, id: string) {
  const url = manifestUrlToStreamUrl(provider.manifestUrl, type, id);
  const json = await fetchJsonWithTimeout(url, 8000);
  const streams = Array.isArray(json?.streams) ? (json.streams as RawStream[]) : [];
  return {
    streamUrl: url,
    streams,
  };
}
