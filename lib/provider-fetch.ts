import { ProviderDraft } from "./types";
import { TORRENTIO_INSTANCES } from "./provider-presets";

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

function buildTorrentioStreamUrl(baseUrl: string, type: string, id: string) {
  const normalized = baseUrl.toString().replace(/\/+$/, "");
  const streamPath = `/stream/${encodeURIComponent(type)}/${encodeURIComponent(id)}.json`;
  if (normalized.endsWith("/manifest.json")) {
    return normalized.replace(/\/manifest\.json$/i, streamPath);
  }
  if (normalized.endsWith("manifest.json")) {
    return normalized.replace(/manifest\.json$/i, streamPath.slice(1));
  }
  return `${normalized}${streamPath}`;
}

async function tryTorrentioInstance(
  instanceUrl: string,
  type: string,
  id: string,
  timeoutMs: number,
) {
  const streamUrl = buildTorrentioStreamUrl(instanceUrl, type, id);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(streamUrl, {
      headers: { accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;
    const json = await response.json();
    const streams = Array.isArray(json?.streams) ? (json.streams as RawStream[]) : [];
    return streams.length > 0 ? { streamUrl, streams } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTorrentioWithFallback(type: string, id: string) {
  // If user set a custom manifestUrl, use it directly
  const providerBaseUrl = "https://torrentio.strem.fun/manifest.json";

  for (const instance of TORRENTIO_INSTANCES) {
    const result = await tryTorrentioInstance(instance.url, type, id, 8000);
    if (result && result.streams.length > 0) {
      return result;
    }
  }
  // All instances failed — return empty
  return { streamUrl: "", streams: [] };
}

export async function fetchProviderStreams(provider: ProviderDraft, type: string, id: string) {
  // Torrentio: try multiple instances with automatic fallback
  if (provider.presetKey === "torrentio") {
    return fetchTorrentioWithFallback(type, id);
  }

  const url = manifestUrlToStreamUrl(provider.manifestUrl, type, id);
  const json = await fetchJsonWithTimeout(url, 8000);
  const streams = Array.isArray(json?.streams) ? (json.streams as RawStream[]) : [];
  return {
    streamUrl: url,
    streams,
  };
}
