import { DebridioConfig, ProviderDraft } from "./types";

export const TORRENTIO_DEFAULT_MANIFEST_URL = "https://torrentio.strem.fun/manifest.json";

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

type SerializedProviderNotes = {
  kind: "provider-config";
  presetKey: string;
  debridio?: Partial<DebridioConfig>;
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

export function hydrateProviderDraft(provider: ProviderDraft): ProviderDraft {
  if (provider.presetKey === "torrentio") {
    return {
      ...provider,
      manifestUrl: provider.manifestUrl.trim() || TORRENTIO_DEFAULT_MANIFEST_URL,
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
