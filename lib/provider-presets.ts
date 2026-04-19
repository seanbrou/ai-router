import { DebridioConfig, ProviderDraft } from "./types";

export const TORRENTIO_DEFAULT_MANIFEST_URL = "https://torrentio.strem.fun/manifest.json";

export const TORRENTIO_INSTANCES = [
  { key: "official", url: "https://torrentio.strem.fun/manifest.json" },
  { key: "elfhosted", url: "https://torrentio.elfhosted.com/manifest.json" },
  { key: "lite", url: "https://torrentio.strem.fun/lite/manifest.json" },
];

export const MEDIAFUSION_DEFAULT_MANIFEST_URL = "https://mediafusion.elfhosted.com/manifest.json";
export const COMET_DEFAULT_MANIFEST_URL = "https://comet.elfhosted.com/manifest.json";

export const TORBOX_BASE_URL = "https://stremio.torbox.app";
export const TORBOX_PROVIDER_OPTIONS = [
  { value: "realdebrid", label: "RealDebrid" },
  { value: "alldebrid", label: "AllDebrid" },
  { value: "premiumize", label: "Premiumize" },
  { value: "torbox", label: "TorBox" },
];

export const DEBRIDIO_PROVIDER_OPTIONS = [
  { value: "realdebrid", label: "RealDebrid" },
  { value: "alldebrid", label: "AllDebrid" },
  { value: "premiumize", label: "Premiumize" },
  { value: "easydebrid", label: "EasyDebrid" },
  { value: "debridlink", label: "DebridLink" },
  { value: "torbox", label: "TorBox" },
  { value: "debrider", label: "Debrider" },
];

const DEBRIDIO_DEFAULT_RESOLUTIONS = ["4k", "1440p", "1080p", "720p", "480p", "360p", "unknown"];
const DEBRIDIO_DEFAULT_EXCLUDED_QUALITIES = ["TeleCine", "SCR", "TeleSync", "CAM"];

export const DEBRIDIO_RESOLUTION_OPTIONS = [
  { value: "4k", label: "4K" },
  { value: "1440p", label: "1440p" },
  { value: "1080p", label: "1080p" },
  { value: "720p", label: "720p" },
  { value: "480p", label: "480p" },
  { value: "360p", label: "360p" },
  { value: "unknown", label: "Unknown" },
];

export const DEBRIDIO_QUALITY_OPTIONS = [
  { value: "BluRay REMUX", label: "BluRay REMUX" },
  { value: "BluRay", label: "BluRay" },
  { value: "UHDRip", label: "UHDRip" },
  { value: "HDRip", label: "HDRip" },
  { value: "WEB-DL", label: "WEB-DL" },
  { value: "WEBRip", label: "WEBRip" },
  { value: "BDRip", label: "BDRip" },
  { value: "BRRip", label: "BRRip" },
  { value: "DVDRip", label: "DVDRip" },
  { value: "DVD", label: "DVD" },
  { value: "HDTV", label: "HDTV" },
  { value: "SATRip", label: "SATRip" },
  { value: "TVRip", label: "TVRip" },
  { value: "R5", label: "R5" },
  { value: "PPVRip", label: "PPVRip" },
  { value: "TeleCine", label: "TeleCine" },
  { value: "TeleSync", label: "TeleSync" },
  { value: "SCR", label: "SCR" },
  { value: "CAM", label: "CAM" },
];

type SerializedProviderNotes = {
  kind: "provider-config";
  presetKey: string;
  debridio?: Partial<DebridioConfig>;
  torboxApiKey?: string;
};

function encodeBase64(value: string) {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return window.btoa(value);
  }

  return Buffer.from(value, "utf8").toString("base64");
}

function decodeProviderNotes(notes: string | null) {
  if (!notes) {
    return null;
  }

  try {
    const parsed = JSON.parse(notes) as SerializedProviderNotes;
    if (parsed.kind !== "provider-config") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function createDefaultDebridioConfig(): DebridioConfig {
  return {
    addonApiKey: "",
    provider: "realdebrid",
    providerApiKey: "",
    disableUncached: false,
    maxSize: "",
    maxReturnPerQuality: "",
    resolutions: [...DEBRIDIO_DEFAULT_RESOLUTIONS],
    excludedQualities: [...DEBRIDIO_DEFAULT_EXCLUDED_QUALITIES],
  };
}

export function buildDebridioManifestUrl(config: DebridioConfig) {
  const payload = {
    api_key: config.addonApiKey.trim(),
    provider: config.provider.trim().toLowerCase(),
    providerKey: config.providerApiKey.trim(),
    disableUncached: config.disableUncached,
    maxSize: config.maxSize.trim(),
    maxReturnPerQuality: config.maxReturnPerQuality.trim(),
    resolutions: config.resolutions,
    excludedQualities: config.excludedQualities,
  };

  return `https://addon.debridio.com/${encodeBase64(JSON.stringify(payload))}/manifest.json`;
}

export function buildTorboxManifestUrl(apiKey: string) {
  return `${TORBOX_BASE_URL}/${apiKey.trim()}/manifest.json`;
}

export function hydrateProviderDraft(provider: ProviderDraft): ProviderDraft {
  if (provider.presetKey === "torrentio") {
    return {
      ...provider,
      manifestUrl: provider.manifestUrl.trim() || TORRENTIO_DEFAULT_MANIFEST_URL,
    };
  }

  if (provider.presetKey === "mediafusion") {
    return {
      ...provider,
      manifestUrl: provider.manifestUrl.trim() || MEDIAFUSION_DEFAULT_MANIFEST_URL,
    };
  }

  if (provider.presetKey === "comet") {
    return {
      ...provider,
      manifestUrl: provider.manifestUrl.trim() || COMET_DEFAULT_MANIFEST_URL,
    };
  }

  if (provider.presetKey === "torbox") {
    const parsed = decodeProviderNotes(provider.notes);
    const apiKey = parsed?.presetKey === "torbox" ? parsed.torboxApiKey : "";
    const hasKey = Boolean(apiKey?.trim());
    return {
      ...provider,
      manifestUrl: hasKey
        ? buildTorboxManifestUrl(apiKey!)
        : provider.manifestUrl.trim() || `${TORBOX_BASE_URL}/<api-key>/manifest.json`,
      config: apiKey ? { torbox: { apiKey, disableUncached: false, maxSize: "", maxReturnPerQuality: "" } } : provider.config,
    };
  }

  if (provider.presetKey !== "debridio") {
    return provider;
  }

  const parsed = decodeProviderNotes(provider.notes);
  const debridioConfig = {
    ...createDefaultDebridioConfig(),
    ...(parsed?.presetKey === "debridio" ? parsed.debridio : undefined),
  };

  const hasRequiredKeys =
    debridioConfig.addonApiKey.trim().length > 0 &&
    debridioConfig.providerApiKey.trim().length > 0;

  return {
    ...provider,
    manifestUrl: hasRequiredKeys
      ? buildDebridioManifestUrl(debridioConfig)
      : provider.manifestUrl.trim(),
    config: {
      debridio: debridioConfig,
    },
  };
}

export function normalizeProviderDraftForSave(provider: ProviderDraft) {
  let manifestUrl = provider.manifestUrl.trim();
  let notes = provider.notes?.trim() || null;

  if (provider.presetKey === "torrentio" && !manifestUrl) {
    manifestUrl = TORRENTIO_DEFAULT_MANIFEST_URL;
  }

  if (provider.presetKey === "mediafusion" && !manifestUrl) {
    manifestUrl = MEDIAFUSION_DEFAULT_MANIFEST_URL;
  }

  if (provider.presetKey === "comet" && !manifestUrl) {
    manifestUrl = COMET_DEFAULT_MANIFEST_URL;
  }

  if (provider.presetKey === "torbox") {
    const torboxConfig = provider.config?.torbox;
    const hasKey = Boolean(torboxConfig?.apiKey?.trim());
    if (hasKey && torboxConfig) {
      manifestUrl = buildTorboxManifestUrl(torboxConfig.apiKey);
      notes = JSON.stringify({
        kind: "provider-config",
        presetKey: "torbox",
        torboxApiKey: torboxConfig.apiKey.trim(),
      } satisfies SerializedProviderNotes);
    } else if (!manifestUrl || manifestUrl.includes("<api-key>")) {
      return {
        error: "TorBox needs your API key to generate the manifest URL.",
      };
    }
  }

  if (provider.presetKey === "debridio") {
    const config = provider.config?.debridio;
    const hasApiKeys = Boolean(
      config?.addonApiKey.trim() && config?.providerApiKey.trim() && config.provider.trim(),
    );

    if (hasApiKeys && config) {
      manifestUrl = buildDebridioManifestUrl(config);
      notes = JSON.stringify({
        kind: "provider-config",
        presetKey: "debridio",
        debridio: config,
      } satisfies SerializedProviderNotes);
    } else if (!manifestUrl) {
      return {
        error: "Debridio needs either a generated config or a full manifest URL.",
      };
    }
  }

  return {
    provider: {
      presetKey: provider.presetKey,
      label: provider.label,
      manifestUrl,
      notes,
      enabled: provider.enabled,
      sortOrder: provider.sortOrder,
    },
  };
}
