export type ProfilePreferences = {
  preferredQualities: string[];
  preferredLanguages: string[];
  preferredCodecs: string[];
  maxSizeGb: number | null;
  preferDebrid: boolean;
  preferCached: boolean;
  strictness: "balanced" | "quality-first" | "speed-first" | "custom-prompt";
  customPrompt?: string | null;
};

export type DebridioConfig = {
  addonApiKey: string;
  provider: string;
  providerApiKey: string;
  disableUncached: boolean;
  maxSize: string;
  maxReturnPerQuality: string;
  resolutions: string[];
  excludedQualities: string[];
};

export type TorboxConfig = {
  apiKey: string;
  disableUncached: boolean;
  maxSize: string;
  maxReturnPerQuality: string;
};

export type ProviderDraft = {
  presetKey: string;
  label: string;
  manifestUrl: string;
  notes: string | null;
  enabled: boolean;
  sortOrder: number;
  config?: {
    debridio?: DebridioConfig;
    torbox?: TorboxConfig;
  };
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
  providerPriority: number;
  originalStream: Record<string, unknown>;
  name: string;
  title: string;
  description: string;
  quality: string | null;
  source: string | null;
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
