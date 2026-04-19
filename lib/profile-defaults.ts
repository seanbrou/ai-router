import { ProfilePreferences, ProviderDraft, TorboxConfig } from "./types";
import { createDefaultDebridioConfig, TORRENTIO_DEFAULT_MANIFEST_URL, MEDIAFUSION_DEFAULT_MANIFEST_URL, COMET_DEFAULT_MANIFEST_URL } from "./provider-presets";

/* ── Dropdown option exports ─────────────────────────────────────── */
export const QUALITY_OPTIONS = [
  { value: "4K", label: "4K" },
  { value: "2160p", label: "2160p" },
  { value: "1080p", label: "1080p" },
  { value: "720p", label: "720p" },
  { value: "480p", label: "480p" },
];

export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "ru", label: "Russian" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
];

export const CODEC_OPTIONS = [
  { value: "HEVC", label: "HEVC (H.265)" },
  { value: "AV1", label: "AV1" },
  { value: "AVC", label: "AVC (H.264)" },
  { value: "VP9", label: "VP9" },
];

export const SIZE_OPTIONS = [
  { value: "", label: "No limit" },
  { value: "2", label: "≤ 2 GB" },
  { value: "5", label: "≤ 5 GB" },
  { value: "10", label: "≤ 10 GB" },
  { value: "20", label: "≤ 20 GB" },
  { value: "50", label: "≤ 50 GB" },
];

export const GEMINI_MODEL_OPTIONS = [
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
  { value: "gemini-3-pro-preview", label: "Gemini 3 Pro Preview" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "gemini-flash-latest", label: "Gemini Flash Latest" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
];

export const PROFILE_NAME_OPTIONS = [
  { value: "My AI Sorter Profile", label: "Default" },
  { value: "Movie Night", label: "Movie Night" },
  { value: "Anime Watchlist", label: "Anime Watchlist" },
  { value: "Quality Purist", label: "Quality Purist" },
  { value: "Quick Stream", label: "Quick Stream" },
  { value: "custom", label: "Custom..." },
];

export const PROVIDER_PRESET_OPTIONS = [
  { value: "torrentio", label: "Torrentio" },
  { value: "mediafusion", label: "MediaFusion" },
  { value: "comet", label: "Comet" },
  { value: "debridio", label: "Debridio" },
  { value: "torbox", label: "TorBox" },
  { value: "custom", label: "Custom" },
];

/* ── Defaults ────────────────────────────────────────────────────── */
export const DEFAULT_PREFERENCES: ProfilePreferences = {
  preferredQualities: ["2160p", "1080p", "720p"],
  preferredLanguages: ["en"],
  preferredCodecs: ["HEVC", "AV1", "AVC"],
  maxSizeGb: null,
  preferDebrid: true,
  preferCached: true,
  strictness: "balanced",
  customPrompt: null,
};

export const PROFILE_PRESET_DEFAULTS: Record<string, Partial<ProfilePreferences> & { name: string }> = {
  "My AI Sorter Profile": {
    name: "My AI Sorter Profile",
    strictness: "balanced",
    customPrompt: null,
  },
  "Movie Night": {
    name: "Movie Night",
    preferredQualities: ["2160p", "1080p"],
    preferredLanguages: ["en"],
    preferredCodecs: ["HEVC", "AV1"],
    preferDebrid: true,
    preferCached: true,
    strictness: "quality-first",
    customPrompt: null,
  },
  "Anime Watchlist": {
    name: "Anime Watchlist",
    preferredQualities: ["1080p", "720p"],
    preferredLanguages: ["ja", "en"],
    preferredCodecs: ["AV1", "HEVC", "AVC"],
    preferDebrid: true,
    preferCached: true,
    strictness: "balanced",
    customPrompt: "Prefer dual-audio or original Japanese audio releases when available, and slightly favor smaller fast-start encodes over giant remuxes.",
  },
  "Quality Purist": {
    name: "Quality Purist",
    preferredQualities: ["2160p", "1080p"],
    preferredLanguages: ["en"],
    preferredCodecs: ["AV1", "HEVC"],
    preferDebrid: true,
    preferCached: true,
    strictness: "quality-first",
    customPrompt: "Strongly favor the cleanest video source, premium codecs, HDR, Dolby Vision, and large high-bitrate releases over convenience.",
  },
  "Quick Stream": {
    name: "Quick Stream",
    preferredQualities: ["1080p", "720p", "480p"],
    preferredLanguages: ["en"],
    preferredCodecs: ["AVC", "HEVC", "AV1"],
    maxSizeGb: 10,
    preferDebrid: true,
    preferCached: true,
    strictness: "speed-first",
    customPrompt: "Bias toward streams that are most likely to start immediately and play smoothly, even if they are not the absolute highest quality.",
  },
};

export function applyProfilePreset(presetValue: string): ProfilePreferences {
  const preset = PROFILE_PRESET_DEFAULTS[presetValue];
  return {
    ...DEFAULT_PREFERENCES,
    ...(preset ?? {}),
    customPrompt: preset?.customPrompt ?? null,
  };
}

export function createDefaultTorboxConfig(): TorboxConfig {
  return {
    apiKey: "",
    disableUncached: false,
    maxSize: "",
    maxReturnPerQuality: "",
  };
}

export function createProviderDraft(presetKey = "torrentio", sortOrder = 0): ProviderDraft {
  const labelMap: Record<string, string> = {
    torrentio: "Torrentio",
    mediafusion: "MediaFusion",
    comet: "Comet",
    debridio: "Debridio",
    torbox: "TorBox",
    custom: "Custom provider",
  };
  const urlMap: Record<string, string> = {
    torrentio: TORRENTIO_DEFAULT_MANIFEST_URL,
    mediafusion: MEDIAFUSION_DEFAULT_MANIFEST_URL,
    comet: COMET_DEFAULT_MANIFEST_URL,
  };
  return {
    presetKey,
    label: labelMap[presetKey] ?? presetKey,
    manifestUrl: urlMap[presetKey] ?? "",
    notes: null,
    enabled: true,
    sortOrder,
    config:
      presetKey === "debridio"
        ? {
            debridio: createDefaultDebridioConfig(),
          }
        : presetKey === "torbox"
          ? {
              torbox: createDefaultTorboxConfig(),
            }
          : undefined,
  };
}

export function splitCsv(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
