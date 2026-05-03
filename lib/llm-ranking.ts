/**
 * Multi-provider LLM ranking for stream candidates.
 *
 * Supports:
 *   - Gemini (Google AI Studio / Vertex)
 *   - OpenCode Go (Sean's subscription, free)
 *   - Any OpenAI-compatible endpoint (bring your own key)
 *   - "none" — deterministic scoring only
 */

import { StreamCandidate } from "./types";

// ── Types ────────────────────────────────────────────────────────────────────

export type LlmProvider = "gemini" | "opencode-go" | "openai-compatible" | "none";

export type LlmConfig = {
  provider: LlmProvider;
  apiKey: string;
  model: string;
  /** For openai-compatible: base URL (defaults to OpenCode Go) */
  baseUrl?: string;
};

type LlmRanking = {
  candidateId: string;
  score: number;
  reason: string;
  flags?: string[];
};

// ── Default configs ──────────────────────────────────────────────────────────

export const OPENCODE_GO_BASE_URL = "https://opencode.ai/zen/go/v1";
export const OPENCODE_GO_DEFAULT_MODEL = "qwen3.6-plus";

export function defaultLlmConfig(): LlmConfig {
  return {
    provider: "none",
    apiKey: "",
    model: OPENCODE_GO_DEFAULT_MODEL,
    baseUrl: OPENCODE_GO_BASE_URL,
  };
}

// ── Prompt builder (shared across backends) ──────────────────────────────────

function buildRankingPrompt(args: {
  candidatesToSend: StreamCandidate[];
  mediaLabel: string;
  preferredQualities: string[];
  preferredLanguages: string[];
  preferredCodecs: string[];
  maxSizeGb: number | null;
  strictness: string;
  customPrompt?: string | null;
}): string {
  const {
    candidatesToSend,
    mediaLabel,
    preferredQualities,
    preferredLanguages,
    preferredCodecs,
    maxSizeGb,
    strictness,
    customPrompt,
  } = args;

  const strictnessLine =
    strictness === "quality-first"
      ? "MODE: Quality-first. Favor the highest quality even if file size is larger. Prioritize BluRay REMUX/BluRay and premium codecs."
      : strictness === "speed-first"
        ? "MODE: Speed-first. Favor smaller, cached, instant-starting streams. Penalize huge files and torrents with few seeders."
        : "MODE: Balanced. Balance quality, speed, and reliability.";

  return [
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
    "",
    "2. LANGUAGE (second priority):",
    "   - Score boost +20 to +30 if stream includes the user's preferred language.",
    "   - EXCELLENT: Multi-audio / dual-audio streams that include the user's language.",
    "   - BAD: Stream is ONLY in languages the user did not request. Subtract 30-50 points.",
    "   - WARNING: If filename suggests foreign audio (KORSUB, VOSTFR, GERMAN, RUSSIAN) but metadata claims user's language, flag as 'possible_lang_mismatch'.",
    "",
    "3. PROVIDER ORDER (third priority):",
    "   - The user ordered providers by trust. Provider #0 is their most trusted.",
    "   - Give a small bonus (+5 to +15) to higher-priority providers.",
    "",
    "4. SOURCE TYPE:",
    "   - Premium: BluRay REMUX, BluRay → best video quality.",
    "   - Good: WEB-DL, WEBRip → decent quality.",
    "   - Mediocre: HDTV, DVDRip → watchable but not great.",
    "   - Bad: CAM, HDCAM, TeleSync, TeleCine, SCR, R5 → terrible quality.",
    "   - MISLABEL PENALTY: If a CAM/TS is labeled as BluRay or WEB-DL, subtract 50-70 points and flag 'mislabeled_source'.",
    "",
    "5. CODEC: HEVC/H.265 and AV1 are efficient. AVC/H.264 is universally compatible.",
    "",
    "6. HDR / Dolby Vision: Small bonus (+5 to +10) for HDR10, HDR10+, Dolby Vision.",
    "",
    "7. RELIABILITY:",
    "   - CACHED or DEBRID streams are almost always working → +15 to +25 bonus.",
    "   - Torrents with 0 seeders are likely DEAD → subtract 40 points, flag 'likely_dead'.",
    "   - Torrents with <5 seeders are risky → subtract 15-25 points.",
    "",
    "8. SIZE SANITY:",
    "   - 2160p movie: >3 GB ideal, <2 GB suspicious.",
    "   - 1080p movie: >1 GB ideal, <0.5 GB suspicious.",
    "   - 720p movie: >0.6 GB ideal, <0.3 GB suspicious.",
    "   - If size is way too small for claimed quality, flag 'suspicious_size'.",
    "   - If size is absurdly huge (>50 GB for 1080p), flag 'oversized'.",
    "",
    "9. NAMING RED FLAGS:",
    "   - 'KORSUB', 'VOSTFR', 'GERDUB', 'RUSDUB' but user wants English → wrong language.",
    "   - 'COMPLETE.BLURAY' without proper size → likely fake.",
    "   - Random alphanumeric strings with no metadata → suspicious.",
    "",
    strictnessLine,
    customPrompt ? `CUSTOM USER INSTRUCTIONS: ${customPrompt}` : null,
    "",
    "=== CONTEXT ===",
    `Media: ${mediaLabel}`,
    `User preferred qualities: ${preferredQualities.join(", ") || "any"}`,
    `User preferred languages: ${preferredLanguages.join(", ") || "any"}`,
    `User preferred codecs: ${preferredCodecs.join(", ") || "any"}`,
    `Max size limit: ${maxSizeGb ? `${maxSizeGb} GB` : "none"}`,
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
}

// ── Response parsing (shared) ────────────────────────────────────────────────

function extractTextFromGemini(response: unknown): string {
  const json = response as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function extractTextFromOpenAI(response: unknown): string {
  const json = response as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? "";
}

function parseRankings(text: string): LlmRanking[] {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || trimmed;
  try {
    const parsed = JSON.parse(candidate);
    return Array.isArray(parsed?.rankings) ? parsed.rankings : [];
  } catch {
    return [];
  }
}

// ── Gemini backend ───────────────────────────────────────────────────────────

async function callGemini(config: LlmConfig, prompt: string): Promise<LlmRanking[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": config.apiKey,
    },
    body: JSON.stringify({
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.15,
      },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Gemini API error ${response.status}: ${body}`);
  }

  const text = extractTextFromGemini(await response.json());
  return parseRankings(text);
}

// ── OpenAI-compatible backend (OpenCode Go, etc.) ────────────────────────────

async function callOpenAICompatible(config: LlmConfig, prompt: string): Promise<LlmRanking[]> {
  const baseUrl = (config.baseUrl || OPENCODE_GO_BASE_URL).replace(/\/+$/, "");
  const url = `${baseUrl}/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "system",
          content:
            "You are an expert Stremio stream evaluator. Return ONLY valid JSON. Never include markdown, explanations, or extra text. Your entire response must be a JSON object with a 'rankings' array.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.15,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`LLM API error ${response.status}: ${body}`);
  }

  const text = extractTextFromOpenAI(await response.json());
  return parseRankings(text);
}

// ── Main rerank function ─────────────────────────────────────────────────────

const LLM_MAX_CANDIDATES = 30;

export async function rerankWithLlm(args: {
  candidates: StreamCandidate[];
  llm: LlmConfig;
  mediaLabel: string;
  preferredQualities: string[];
  preferredLanguages: string[];
  preferredCodecs: string[];
  maxSizeGb: number | null;
  strictness: string;
  customPrompt?: string | null;
}): Promise<StreamCandidate[]> {
  const { candidates, llm, mediaLabel, preferredQualities, preferredLanguages, preferredCodecs, maxSizeGb, strictness, customPrompt } =
    args;

  if (llm.provider === "none" || !llm.apiKey || candidates.length === 0) {
    return candidates;
  }

  // Sort by deterministic score so we send the best candidates to the LLM
  const sorted = [...candidates].sort((a, b) => b.deterministicScore - a.deterministicScore);

  // Take top N + a few bottom candidates for contrast
  const topN = Math.min(sorted.length, Math.max(LLM_MAX_CANDIDATES - 3, sorted.length));
  const topCandidates = sorted.slice(0, topN);
  const bottomCandidates = sorted.length > topN ? sorted.slice(-3) : [];
  const candidatesToSend = [...topCandidates, ...bottomCandidates];
  const sentIds = new Set(candidatesToSend.map((c) => c.candidateId));

  const prompt = buildRankingPrompt({
    candidatesToSend,
    mediaLabel,
    preferredQualities,
    preferredLanguages,
    preferredCodecs,
    maxSizeGb,
    strictness,
    customPrompt,
  });

  try {
    let rankings: LlmRanking[];

    switch (llm.provider) {
      case "gemini":
        rankings = await callGemini(llm, prompt);
        break;
      case "opencode-go":
      case "openai-compatible":
        rankings = await callOpenAICompatible(llm, prompt);
        break;
      default:
        return candidates;
    }

    const rankingMap = new Map(rankings.map((r) => [r.candidateId, r]));

    return candidates.map((candidate) => {
      if (!sentIds.has(candidate.candidateId)) return candidate;

      const ranking = rankingMap.get(candidate.candidateId);
      if (!ranking) return candidate;

      const flags = ranking.flags ?? [];
      const llmScore = Number.isFinite(ranking.score)
        ? Math.max(0, Math.min(100, ranking.score))
        : 50;

      // Combine: deterministic anchors, LLM dominates
      const deterministicWeight = 0.35;
      const llmWeight = 1.35;
      let finalScore =
        candidate.deterministicScore * deterministicWeight + llmScore * llmWeight;

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
    console.warn("[ai-router] LLM rerank failed:", err);
    return candidates;
  }
}
