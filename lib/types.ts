export type ProfilePreferences = {
  preferredQualities: string[];
  preferredLanguages: string[];
  preferredCodecs: string[];
  maxSizeGb: number | null;
  preferDebrid: boolean;
  preferCached: boolean;
  strictness: "balanced" | "quality-first" | "speed-first";
};

export type ProviderDraft = {
  presetKey: string;
  label: string;
  manifestUrl: string;
  notes: string | null;
  enabled: boolean;
  sortOrder: number;
};

export type InstallProfile = {
  name: string;
  installToken: string;
  preferences: ProfilePreferences;
  providers: ProviderDraft[];
  gemini: {
    apiKey: string | null;
    model: string;
  };
};

export type StreamCandidate = {
  candidateId: string;
  providerLabel: string;
  manifestUrl: string;
  originalStream: Record<string, unknown>;
  name: string;
  title: string;
  description: string;
  quality: string | null;
  codec: string | null;
  hdr: string | null;
  languages: string[];
  sizeGb: number | null;
  seeders: number | null;
  isCached: boolean;
  isDebrid: boolean;
  deterministicScore: number;
  llmScore: number | null;
  finalScore: number;
  reason: string;
};
