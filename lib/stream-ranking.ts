import { InstallProfile, StreamCandidate } from "./types";

// ── Quality constants ──────────────────────────────────────────────────────────────────
const QUALITY_ORDER = ["2160p", "1080p", "720p", "480p", "360p", "240p"];

const QUALITY_PATTERNS: Array<[RegExp, string]> = [
  [/\b(2160p|4k\s*uhd?|uhd\s*4k|4kuhd|ultra\s*hd)\b/i, "2160p"],
  [/\b(1080p|fhd|full\s*hd)\b/i, "1080p"],
  [/\b(720p|hd\s*(?!audio))\b/i, "720p"],
  [/\b(480p|sd\s*(?!h|audio))\b/i, "480p"],
  [/\b(360p)\b/i, "360p"],
  [/\b(240p)\b/i, "240p"],
];

const CODEC_PATTERNS: Array<[RegExp, string]> = [
  [/\bav1\b/i, "AV1"],
  [/\b(x265|h\.?265|hevc)\b/i, "HEVC"],
  [/\b(x264|h\.?264|avc)\b/i, "AVC"],
  [/\bvp9\b/i, "VP9"],
  [/\b(mpeg-?2|mp2v)\b/i, "MPEG-2"],
  [/\b(mpeg-?4|mp4v|divx|xvid)\b/i, "MPEG-4"],
];

const HDR_PATTERNS: Array<[RegExp, string]> = [
  [/\b(dolby\s*vision|dv\s*(?:hdr|profile)|dolbyvision)\b/i, "Dolby Vision"],
  [/\bhdr10\+\b/i, "HDR10+"],
  [/\bhdr10\b/i, "HDR10"],
  [/\bhdr\b/i, "HDR"],
  [/\b(hlg)\b/i, "HLG"],
];

const SOURCE_PATTERNS: Array<[RegExp, string]> = [
  [/\b(bluray\s*remux|bdremux)\b/i, "BluRay REMUX"],
  [/\b(bluray|bdrip|bd-rip|blu-ray)\b/i, "BluRay"],
  [/\b(web-?dl|webdl)\b/i, "WEB-DL"],
  [/\b(web-?rip|webrip)\b/i, "WEBRip"],
  [/\b(hdtv|tv-?rip|tvrip)\b/i, "HDTV"],
  [/\b(dvdrip|dvd-?rip)\b/i, "DVDRip"],
  [/\b(dvdscr|dvd-?scr)\b/i, "DVDSCR"],
  [/\b(hdcam|hd-?cam)\b/i, "HDCAM"],
  [/\b(cam|camrip)\b/i, "CAM"],
  [/\b(ts|telesync)\b/i, "TeleSync"],
  [/\b(tc|telecine)\b/i, "TeleCine"],
  [/\b(screener|scr)\b/i, "SCR"],
  [/\br5\b/i, "R5"],
];

const LANGUAGE_PATTERNS: Array<[RegExp, string]> = [
  [/\beng?(?:lish)?\b|(?<![a-z])en(?![a-z])/i, "en"],
  [/\bspa(?:nish)?\b|\bes(?![a-z])/i, "es"],
  [/\bfre(?:nch)?\b|\bfr(?![a-z])/i, "fr"],
  [/\bger(?:man)?\b|\bde(?![a-z])/i, "de"],
  [/\bita(?:lian)?\b|\bit(?![a-z])/i, "it"],
  [/\bpor(?:tuguese)?\b|\bpt(?![a-z])/i, "pt"],
  [/\bjap(?:anese)?\b|\bja(?![a-z])/i, "ja"],
  [/\bkor(?:ean)?\b|\bko(?![a-z])/i, "ko"],
  [/\bchi(?:nese)?\b|\bzh(?![a-z])/i, "zh"],
  [/\brus(?:sian)?\b|\bru(?![a-z])/i, "ru"],
  [/\bara(?:bic)?\b|\bar(?![a-z])/i, "ar"],
  [/\bhin(?:di)?\b|\bhi(?![a-z])/i, "hi"],
  [/\btur(?:kish)?\b|\btr(?![a-z])/i, "tr"],
  [/\bpol(?:ish)?\b|\bpl(?![a-z])/i, "pl"],
  [/\bdut(?:ch)?\b|\bnl(?![a-z])/i, "nl"],
  [/\bswe(?:dish)?\b|\bsv(?![a-z])/i, "sv"],
  [/\bnor(?:wegian)?\b|\bno(?![a-z])/i, "no"],
  [/\bdan(?:ish)?\b|\bda(?![a-z])/i, "da"],
  [/\bfi(?:nnish)?\b|\bfi(?![a-z])/i, "fi"],
  [/\bcze(?:ch)?\b|\bcs(?![a-z])/i, "cs"],
  [/\bhun(?:garian)?\b|\bhu(?![a-z])/i, "hu"],
  [/\bgre(?:ek)?\b|\bel(?![a-z])/i, "el"],
  [/\bheb(?:rew)?\b|\bhe(?![a-z])/i, "he"],
  [/\btha(?:i)?\b|\bth(?![a-z])/i, "th"],
  [/\bvie(?:tnamese)?\b|\bvi(?![a-z])/i, "vi"],
  [/\bind(?:onesian)?\b|\bid(?![a-z])/i, "id"],
  [/\bmay(?:lay)?\b|\bms(?![a-z])/i, "ms"],
  [/\btam(?:il)?\b|\bta(?![a-z])/i, "ta"],
  [/\btel(?:ugu)?\b|\bte(?![a-z])/i, "te"],
  [/\bmar(?:athi)?\b|\bmr(?![a-z])/i, "mr"],
  [/\bben(?:gali)?\b|\bbn(?![a-z])/i, "bn"],
  [/\burd(?:u)?\b|\bur(?![a-z])/i, "ur"],
  [/\bpun(?:jabi)?\b|\bpa(?![a-z])/i, "pa"],
  [/\bguj(?:arati)?\b|\bgu(?![a-z])/i, "gu"],
  [/\bkan(?:nada)?\b|\bkn(?![a-z])/i, "kn"],
  [/\bmala(?:yalam)?\b|\bml(?![a-z])/i, "ml"],
];

// ── Text extraction ──────────────────────────────────────────────────────────────────
function extractAllText(stream: Record<string, unknown>): string {
  const parts: string[] = [];

  // Standard display fields
  for (const key of ["name", "title", "description"]) {
    const val = stream[key];
    if (typeof val === "string" && val.length > 0) {
      parts.push(val);
    }
  }

  // Filename often has the richest metadata (quality, source, codec, audio)
  const behaviorHints = stream.behaviorHints;
  if (behaviorHints && typeof behaviorHints === "object") {
    const bh = behaviorHints as Record<string, unknown>;
    for (const key of ["filename", "bingeGroup", "videoCodec", "audioCodec"]) {
      const val = bh[key];
      if (typeof val === "string" && val.length > 0) {
        parts.push(val);
      }
    }
  }

  // Direct URL may contain hints
  for (const key of ["url", "externalUrl", "infoHash"]) {
    const val = stream[key];
    if (typeof val === "string" && val.length > 0) {
      parts.push(val);
    }
  }

  return parts.join(" ");
}

// ── Parsers ─────────────────────────────────────────────────────────────────────
function parseQuality(text: string): string | null {
  for (const [pattern, quality] of QUALITY_PATTERNS) {
    if (pattern.test(text)) return quality;
  }
  return null;
}

function parseCodec(text: string): string | null {
  for (const [pattern, codec] of CODEC_PATTERNS) {
    if (pattern.test(text)) return codec;
  }
  return null;
}

function parseHdr(text: string): string | null {
  for (const [pattern, hdr] of HDR_PATTERNS) {
    if (pattern.test(text)) return hdr;
  }
  return null;
}

function parseSource(text: string): string | null {
  for (const [pattern, source] of SOURCE_PATTERNS) {
    if (pattern.test(text)) return source;
  }
  return null;
}

function parseSizeGb(text: string): number | null {
  // Match "5.2 GB", "1.5GB", "800 MB", etc.
  const match = text.match(/(\d+(?:\.\d+)?)\s?(gb|gib|mb|mib|tb|tib)/i);
  if (!match) return null;

  const value = Number.parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(value)) return null;

  if (unit.startsWith("t")) return value * 1024;
  if (unit.startsWith("m")) return value / 1024;
  return value;
}

function parseSeeders(text: string): number | null {
  // Match ↑ 156, seeders: 42, etc.
  const match = text.match(/(?:↑|seed|seeder|peer|leech)[^\d]*(\d{1,6})/i);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}

function parseLanguages(text: string): string[] {
  const languages = new Set<string>();
  const lower = text.toLowerCase();

  for (const [pattern, code] of LANGUAGE_PATTERNS) {
    if (pattern.test(text)) {
      languages.add(code);
    }
  }

  // Multi-audio / dual-audio detection
  if (/\b(multi[-\s]?audio|dual[-\s]?audio|multi[-\s]?lang|multi[-\s]?sub|multiple[-\s]?audio)\b/i.test(text)) {
    languages.add("multi");
  }

  // If we detected multiple specific languages, also tag as multi
  if (languages.size >= 2) {
    languages.add("multi");
  }

  return Array.from(languages);
}

// ── Scoring helpers ──────────────────────────────────────────────────────────────────
function scoreQuality(order: string[], value: string | null): number {
  if (!value) return 0;
  const normalized = value.toLowerCase();
  const idx = order.findIndex((q) => q.toLowerCase() === normalized);
  if (idx === -1) return 5; // Unknown quality gets minimal points
  // First preference = 100, each step down = -18, minimum 10
  return Math.max(100 - idx * 18, 10);
}

function scoreCodec(order: string[], value: string | null): number {
  if (!value) return 0;
  const normalized = value.toUpperCase();
  const idx = order.findIndex((c) => c.toUpperCase() === normalized);
  if (idx === -1) return 5;
  return Math.max(40 - idx * 10, 5);
}

function scoreLanguage(preferred: string[], actual: string[]): number {
  if (actual.length === 0) return 0; // Unknown = neutral

  const hasPreferred = preferred.some((p) => actual.includes(p));
  const isMulti = actual.includes("multi");
  const hasOnlyOther = !hasPreferred && !isMulti;

  if (hasPreferred && isMulti) {
    // User's language + others (e.g., dual audio) → excellent
    return 70;
  }
  if (hasPreferred && actual.length === 1) {
    // User's language only → great
    return 60;
  }
  if (isMulti && !hasPreferred) {
    // Multi but we don't know if user's lang is there → moderate
    return 30;
  }
  if (hasOnlyOther) {
    // Only languages the user didn't ask for → penalty
    return -40;
  }
  return 0;
}

function scoreProviderPriority(priority: number): number {
  // Provider #0 = +50, #1 = +38, #2 = +26, #3 = +14, #4+ = +5
  return Math.max(50 - priority * 12, 5);
}

function sourceRank(source: string | null): number {
  if (!source) return 3;
  const rank: Record<string, number> = {
    "BluRay REMUX": 1,
    "BluRay": 2,
    "WEB-DL": 3,
    "WEBRip": 4,
    "HDTV": 5,
    "DVDRip": 6,
    "DVDSCR": 7,
    "HDCAM": 8,
    "CAM": 9,
    "TeleSync": 10,
    "TeleCine": 11,
    "SCR": 12,
    "R5": 13,
  };
  return rank[source] ?? 3;
}

function deterministicReason(candidate: StreamCandidate): string {
  const parts: string[] = [];
  if (candidate.quality) parts.push(candidate.quality);
  if (candidate.source) parts.push(candidate.source);
  if (candidate.codec) parts.push(candidate.codec);
  if (candidate.hdr) parts.push(candidate.hdr);
  if (candidate.languages.length > 0) parts.push(candidate.languages.join("/"));
  if (candidate.isCached) parts.push("⚡ cached");
  if (candidate.isDebrid) parts.push("🔗 debrid");
  if (candidate.sizeGb) parts.push(`${candidate.sizeGb.toFixed(1)} GB`);
  if (candidate.seeders && candidate.seeders > 0) parts.push(`↑ ${candidate.seeders}`);
  parts.push(`via ${candidate.providerLabel}`);
  return parts.join(" · ");
}

// ── Normalization ──────────────────────────────────────────────────────────────────
export function normalizeStreamCandidate(
  providerLabel: string,
  manifestUrl: string,
  stream: Record<string, unknown>,
  preferences: InstallProfile["preferences"],
  index: number,
  providerPriority: number,
): StreamCandidate {
  const text = extractAllText(stream);
  const quality = parseQuality(text);
  const codec = parseCodec(text);
  const hdr = parseHdr(text);
  const source = parseSource(text);
  const sizeGb = parseSizeGb(text);
  const seeders = parseSeeders(text);
  const languages = parseLanguages(text);

  const lowerText = text.toLowerCase();
  const isCached = /\b(cache|cached|instant|direct|cloud)\b/i.test(lowerText);
  const isDebrid = /\b(realdebrid|real-debrid|alldebrid|all-debrid|premiumize|debrid|debrid-link|torbox|easydebrid|debrider)\b/i.test(lowerText);

  // Base score
  let score = 20;

  // Quality (0-100)
  score += scoreQuality(preferences.preferredQualities, quality);

  // Language (0-70, or -40 if wrong language)
  score += scoreLanguage(preferences.preferredLanguages, languages);

  // Provider priority (5-50)
  score += scoreProviderPriority(providerPriority);

  // Codec (0-40)
  score += scoreCodec(preferences.preferredCodecs, codec);

  // HDR bonus
  if (hdr) score += 15;

  // Source quality bonus (better source = higher score)
  const srcRank = sourceRank(source);
  score += Math.max(20 - srcRank * 2, 0);

  // Debrid / cached
  if (preferences.preferDebrid && isDebrid) score += 20;
  if (preferences.preferCached && isCached) score += 15;

  // Size penalty
  if (sizeGb && preferences.maxSizeGb && sizeGb > preferences.maxSizeGb) {
    score -= 30;
  }

  // Seeders bonus
  if (seeders && seeders > 0) {
    score += Math.min(Math.log10(seeders) * 8, 25);
  }

  // Strictness modifiers
  if (preferences.strictness === "quality-first") {
    score += scoreQuality(["2160p", "1080p", "720p", "480p"], quality) * 0.3;
    score += (sourceRank(source) <= 3 ? 10 : 0);
  }
  if (preferences.strictness === "speed-first") {
    if (isCached) score += 15;
    if (isDebrid) score += 10;
    if (sizeGb) {
      score -= Math.min(sizeGb * 1.2, 15); // Penalize huge files
    }
    if (seeders && seeders < 10) {
      score -= 10; // Penalize low-seeder torrents for speed mode
    }
  }

  // List position tiebreaker (small penalty for later in provider response)
  score -= index * 0.3;

  // Extract original name/title for display fallback
  const originalName = typeof stream.name === "string" ? stream.name : "";
  const originalTitle = typeof stream.title === "string" ? stream.title : "";
  const originalDescription = typeof stream.description === "string" ? stream.description : "";

  return {
    candidateId: `${providerLabel}-${index}-${crypto.randomUUID()}`,
    providerLabel,
    manifestUrl,
    providerPriority,
    originalStream: stream,
    name: originalName || providerLabel,
    title: originalTitle || providerLabel,
    description: originalDescription || originalTitle || providerLabel,
    quality,
    codec,
    hdr,
    source,
    languages,
    sizeGb,
    seeders,
    isCached,
    isDebrid,
    deterministicScore: score,
    llmScore: null,
    finalScore: score,
    reason: "",
  };
}

// ── Gemini ranking ──────────────────────────────────────────────────────────────────
type GeminiRanking = {
  candidateId: string;
  score: number;
  reason: string;
  flags?: string[];
};

function extractText(response: unknown): string {
  const json = response as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function parseJsonResponse(text: string): { rankings?: GeminiRanking[] } {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    return {};
  }
}

const LLM_MAX_CANDIDATES = 30;

export async function rerankWithGemini(args: {
  candidates: StreamCandidate[];
  profile: InstallProfile;
  mediaLabel: string;
}) {
  const { candidates, profile, mediaLabel } = args;
  if (!profile.gemini.apiKey || candidates.length === 0) {
    return candidates;
  }

  // Sort by deterministic score descending so we send the best candidates to the LLM
  const sorted = [...candidates].sort((a, b) => b.deterministicScore - a.deterministicScore);

  // Take top N candidates. Always include a few low-ranked ones so the LLM sees contrast.
  const topN = Math.min(sorted.length, Math.max(LLM_MAX_CANDIDATES - 3, sorted.length));
  const topCandidates = sorted.slice(0, topN);
  const bottomCandidates = sorted.length > topN ? sorted.slice(-3) : [];
  const candidatesToSend = [...topCandidates, ...bottomCandidates];
  const sentIds = new Set(candidatesToSend.map((c) => c.candidateId));

  const strictnessLine =
    profile.preferences.strictness === "quality-first"
      ? "MODE: Quality-first. Favor the highest quality even if file size is larger. Prioritize BluRay REMUX/BluRay and premium codecs."
      : profile.preferences.strictness === "speed-first"
        ? "MODE: Speed-first. Favor smaller, cached, instant-starting streams. Penalize huge files and torrents with few seeders."
        : "MODE: Balanced. Balance quality, speed, and reliability.";

  const prompt = [
    "You are an expert Stremio stream evaluator. Your job is to judge whether each stream candidate is REAL, WORKING, and WORTH recommending.",
    "",
    "RETURN ONLY JSON in this exact format:",
    '{"rankings":[{"candidateId":"...","score":0-100,"reason":"one-line reason","flags":[]}]}',
    "",
    "=== SCORING RULES (apply in this priority order) ===",
    "",
    "1. QUALITY (highest priority):",
    "   - Score 90-100: Matches user's TOP preferred quality with correct source and reasonable size.",
    "   - Score 70-89: Matches user's 2nd/3rd preferred quality.",
    "   - Score 40-69: Lower quality but acceptable.",
    "   - Score 0-39: Quality the user explicitly does NOT want.",
    "   - FAKE QUALITY PENALTY: If a stream claims 1080p/2160p but is absurdly small (<0.8GB for 1080p, <3GB for 2160p movie), it is likely FAKE or mislabeled. Subtract 40-60 points.",
    "   - If quality cannot be determined, be conservative.",
    "",
    "2. LANGUAGE (second priority):",
    "   - Score boost +20 to +30 if stream includes the user's preferred language.",
    "   - EXCELLENT: Multi-audio / dual-audio streams that include the user's language (user gets their lang + extras).",
    "   - BAD: Stream is ONLY in languages the user did not request. Subtract 30-50 points.",
    "   - WARNING: If filename suggests foreign audio (e.g., KORSUB, VOSTFR, GERMAN, RUSSIAN) but metadata claims user's language, flag as 'possible_lang_mismatch'.",
    "",
    "3. PROVIDER ORDER (third priority):",
    "   - The user ordered providers by trust/priority. Provider #0 is their most trusted.",
    "   - Give a small bonus (+5 to +15) to higher-priority providers.",
    "   - But DO NOT let provider override a clearly broken stream from a lower provider.",
    "",
    "4. SOURCE TYPE:",
    "   - Premium: BluRay REMUX, BluRay → best video quality.",
    "   - Good: WEB-DL, WEBRip → decent quality.",
    "   - Mediocre: HDTV, DVDRip → watchable but not great.",
    "   - Bad: CAM, HDCAM, TeleSync, TeleCine, SCR, R5 → terrible quality, only use if nothing else exists.",
    "   - MISLABEL PENALTY: If a CAM/TS is labeled as BluRay or WEB-DL, subtract 50-70 points and flag 'mislabeled_source'.",
    "",
    "5. CODEC:",
    "   - HEVC/H.265 and AV1 are efficient and high quality.",
    "   - AVC/H.264 is universally compatible.",
    "   - VP9 is acceptable.",
    "   - MPEG-2, DivX, XviD are outdated.",
    "",
    "6. HDR / Dolby Vision:",
    "   - Small bonus (+5 to +10) for HDR10, HDR10+, Dolby Vision.",
    "   - Only meaningful if the user has a display that supports it (assume yes).",
    "",
    "7. RELIABILITY / WORKING STATUS (critically important):",
    "   - CACHED or DEBRID streams are almost always working → +15 to +25 bonus.",
    "   - Torrents with 0 seeders are likely DEAD → subtract 40 points, flag 'likely_dead'.",
    "   - Torrents with <5 seeders are risky → subtract 15-25 points.",
    "   - Torrents with 50+ seeders are healthy → small bonus.",
    "   - If size is missing AND it's a torrent with no seeders info, be skeptical.",
    "",
    "8. SIZE SANITY CHECKS:",
    "   - 2160p movie should be >3 GB (ideally 8-25 GB). <2 GB is suspicious.",
    "   - 1080p movie should be >1 GB (ideally 2-10 GB). <0.5 GB is suspicious.",
    "   - 720p movie should be >0.6 GB. <0.3 GB is suspicious.",
    "   - TV episodes can be roughly 1/3 to 1/2 of movie sizes.",
    "   - If size is way too small for claimed quality, flag 'suspicious_size' and subtract 30-50.",
    "   - If size is absurdly huge (>50 GB for 1080p), flag 'oversized' and subtract 10-20.",
    "",
    "9. NAMING RED FLAGS:",
    "   - If title contains 'HC' (hardcoded subs) and user wants English → may be foreign with hard subs.",
    "   - 'KORSUB', 'VOSTFR', 'GERDUB', 'RUSDUB' in title but user wants English → wrong language.",
    "   - 'COMPLETE.BLURAY' without proper size → likely fake.",
    "   - Random alphanumeric strings with no metadata → suspicious.",
    "",
    strictnessLine,
    profile.preferences.customPrompt
      ? `CUSTOM USER INSTRUCTIONS: ${profile.preferences.customPrompt}`
      : null,
    "",
    "=== CONTEXT ===",
    `Media: ${mediaLabel}`,
    `User preferred qualities (in order): ${profile.preferences.preferredQualities.join(", ") || "any"}`,
    `User preferred languages: ${profile.preferences.preferredLanguages.join(", ") || "any"}`,
    `User preferred codecs (in order): ${profile.preferences.preferredCodecs.join(", ") || "any"}`,
    `Prefer debrid: ${profile.preferences.preferDebrid}`,
    `Prefer cached: ${profile.preferences.preferCached}`,
    `Max size limit: ${profile.preferences.maxSizeGb ? `${profile.preferences.maxSizeGb} GB` : "none"}`,
    "",
    "=== CANDIDATES (pre-sorted by deterministic score) ===",
    JSON.stringify(
      candidatesToSend.map((c) => ({
        candidateId: c.candidateId,
        provider: c.providerLabel,
        providerPriority: c.providerPriority,
        title: c.title,
        quality: c.quality,
        source: c.source,
        codec: c.codec,
        hdr: c.hdr,
        languages: c.languages,
        sizeGb: c.sizeGb,
        seeders: c.seeders,
        isCached: c.isCached,
        isDebrid: c.isDebrid,
        deterministicScore: Math.round(c.deterministicScore),
      })),
    ),
    "",
    "=== INSTRUCTIONS ===",
    "Score each candidate 0-100 based on ACTUAL quality and likelihood of working.",
    "Be harsh on fake, mislabeled, or dead streams.",
    "Be generous on well-labeled, properly-sized, cached/debrid streams that match user preferences.",
    "Return the rankings array. Every candidate in the list must have a ranking entry.",
  ]
    .filter((part): part is string => Boolean(part))
    .join("\n");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(profile.gemini.model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": profile.gemini.apiKey,
        },
        body: JSON.stringify({
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.15,
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      console.warn("[ai-router] Gemini API error:", response.status, await response.text().catch(() => ""));
      return candidates;
    }

    const text = extractText(await response.json());
    const parsed = parseJsonResponse(text);
    const rankings = new Map(
      (parsed.rankings ?? []).map((ranking) => [ranking.candidateId, ranking]),
    );

    return candidates.map((candidate) => {
      // If this candidate was not sent to LLM, keep deterministic score
      if (!sentIds.has(candidate.candidateId)) {
        return candidate;
      }

      const ranking = rankings.get(candidate.candidateId);
      if (!ranking) return candidate;

      const flags = ranking.flags ?? [];
      const llmScore = Number.isFinite(ranking.score) ? Math.max(0, Math.min(100, ranking.score)) : 50;

      // Combine scores: deterministic anchors, LLM can dominate
      // LLM score 0-100 gets weighted more heavily than deterministic
      const deterministicWeight = 0.35;
      const llmWeight = 1.35;
      let finalScore = candidate.deterministicScore * deterministicWeight + llmScore * llmWeight;

      // Flag penalties
      if (flags.includes("likely_dead") || flags.includes("mislabeled_source")) {
        finalScore -= 60;
      }
      if (flags.includes("suspicious_size")) {
        finalScore -= 45;
      }
      if (flags.includes("possible_lang_mismatch") || flags.includes("wrong_language")) {
        finalScore -= 35;
      }
      if (flags.includes("oversized")) {
        finalScore -= 15;
      }

      return {
        ...candidate,
        llmScore,
        finalScore,
        reason: ranking.reason,
      };
    });
  } catch (err) {
    console.warn("[ai-router] Gemini rerank failed:", err);
    return candidates;
  }
}

// ── Finalize ─────────────────────────────────────────────────────────────────────
function fingerprintCandidate(candidate: StreamCandidate): string {
  // Best dedup key: infoHash is unique per torrent
  if (typeof candidate.originalStream.infoHash === "string" && candidate.originalStream.infoHash) {
    return candidate.originalStream.infoHash.toLowerCase();
  }
  // Next best: direct URL
  if (typeof candidate.originalStream.url === "string" && candidate.originalStream.url) {
    return candidate.originalStream.url.toLowerCase();
  }
  // Next: external URL
  if (typeof candidate.originalStream.externalUrl === "string" && candidate.originalStream.externalUrl) {
    return candidate.originalStream.externalUrl.toLowerCase();
  }
  // Fallback: composite of quality + source + provider + size + title fingerprint
  const titleFingerprint = candidate.title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 40);
  return `${candidate.providerLabel}:${candidate.quality ?? "?"}:${candidate.source ?? "?"}:${candidate.codec ?? "?"}:${candidate.sizeGb ?? "?"}:${titleFingerprint}`;
}

export function finalizeRanking(candidates: StreamCandidate[]): StreamCandidate[] {
  const deduped = new Map<string, StreamCandidate>();

  for (const candidate of candidates) {
    const normalized = {
      ...candidate,
      reason: candidate.reason || deterministicReason(candidate),
      finalScore: candidate.llmScore === null ? candidate.deterministicScore : candidate.finalScore,
    };
    const key = fingerprintCandidate(normalized);
    const existing = deduped.get(key);
    if (!existing || normalized.finalScore > existing.finalScore) {
      deduped.set(key, normalized);
    }
  }

  return Array.from(deduped.values()).sort((a, b) => b.finalScore - a.finalScore);
}
