import { ProfilePreferences, ProviderDraft } from "./types";

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
