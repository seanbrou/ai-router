import { ProfilePreferences, ProviderDraft } from "./types";

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
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash (Fast)" },
  { value: "gemini-3-pro", label: "Gemini 3 Pro (Smart)" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
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
  { value: "debridio", label: "Debridio" },
  { value: "comet", label: "Comet" },
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
};

export function createProviderDraft(presetKey = "torrentio", sortOrder = 0): ProviderDraft {
  return {
    presetKey,
    label: presetKey === "custom" ? "Custom provider" : presetKey[0].toUpperCase() + presetKey.slice(1),
    manifestUrl: "",
    notes: null,
    enabled: true,
    sortOrder,
  };
}

export function splitCsv(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
