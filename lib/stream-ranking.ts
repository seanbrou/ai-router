import { InstallProfile, StreamCandidate } from "./types";

const QUALITY_ORDER = ["2160p", "1080p", "720p", "480p"];

function combinedText(stream: Record<string, unknown>) {
  return [stream.name, stream.title, stream.description]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");
}

function parseQuality(text: string) {
  if (/2160|4k/i.test(text)) return "2160p";
  if (/1080/i.test(text)) return "1080p";
  if (/720/i.test(text)) return "720p";
  if (/480/i.test(text)) return "480p";
  return null;
}

function parseCodec(text: string) {
  if (/av1/i.test(text)) return "AV1";
  if (/x265|h265|hevc/i.test(text)) return "HEVC";
  if (/x264|h264|avc/i.test(text)) return "AVC";
  return null;
}

function parseHdr(text: string) {
  if (/dolby vision|dv/i.test(text)) return "Dolby Vision";
  if (/hdr10\+/i.test(text)) return "HDR10+";
  if (/hdr/i.test(text)) return "HDR";
  return null;
}

function parseSizeGb(text: string) {
  const match = text.match(/(\d+(?:\.\d+)?)\s?(gb|gib|mb|mib)/i);
  if (!match) return null;

  const value = Number.parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(value)) return null;

  return unit.startsWith("m") ? value / 1024 : value;
}

function parseSeeders(text: string) {
  const match = text.match(/(?:seed|seeder|seeders)[^\d]*(\d{1,5})/i);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}

function parseLanguages(text: string) {
  const languages = new Set<string>();
  const lower = text.toLowerCase();

  if (/\beng?(\b|lish)/i.test(text) || /\ben\b/.test(lower)) languages.add("en");
  if (/\bes\b|spanish/i.test(text)) languages.add("es");
  if (/\bfr\b|french/i.test(text)) languages.add("fr");
  if (/\bpt\b|portuguese/i.test(text)) languages.add("pt");
  if (/multi/i.test(text)) languages.add("multi");

  return Array.from(languages);
}

function scorePreference(order: string[], value: string | null, maxPoints: number) {
  if (!value) return 0;
  const index = order.findIndex((entry) => entry.toLowerCase() === value.toLowerCase());
  if (index === -1) return 0;
  return Math.max(maxPoints - index * 8, 2);
}

function deterministicReason(candidate: StreamCandidate) {
  const reasons = [candidate.providerLabel];
  if (candidate.quality) reasons.push(candidate.quality);
  if (candidate.codec) reasons.push(candidate.codec);
  if (candidate.hdr) reasons.push(candidate.hdr);
  if (candidate.isCached) reasons.push("cached");
  if (candidate.isDebrid) reasons.push("debrid");
  if (candidate.sizeGb) reasons.push(`${candidate.sizeGb.toFixed(1)} GB`);
  return reasons.join(" · ");
}

export function normalizeStreamCandidate(
  providerLabel: string,
  manifestUrl: string,
  stream: Record<string, unknown>,
  preferences: InstallProfile["preferences"],
  index: number,
): StreamCandidate {
  const text = combinedText(stream);
  const quality = parseQuality(text);
  const codec = parseCodec(text);
  const hdr = parseHdr(text);
  const sizeGb = parseSizeGb(text);
  const seeders = parseSeeders(text);
  const languages = parseLanguages(text);
  const isCached = /cache|cached|instant/i.test(text);
  const isDebrid = /realdebrid|real-debrid|all-debrid|premiumize|debrid/i.test(text);

  let deterministicScore = 20;
  deterministicScore += scorePreference(preferences.preferredQualities, quality, 28);
  deterministicScore += scorePreference(preferences.preferredCodecs, codec, 18);

  if (languages.find((language) => preferences.preferredLanguages.includes(language))) {
    deterministicScore += 10;
  }

  if (preferences.preferDebrid && isDebrid) deterministicScore += 12;
  if (preferences.preferCached && isCached) deterministicScore += 12;
  if (sizeGb && preferences.maxSizeGb && sizeGb > preferences.maxSizeGb) deterministicScore -= 24;
  if (seeders) deterministicScore += Math.min(seeders, 20);
  if (preferences.strictness === "quality-first") {
    deterministicScore += scorePreference(QUALITY_ORDER, quality, 10);
  }
  if (preferences.strictness === "speed-first" && sizeGb) {
    deterministicScore -= Math.min(sizeGb * 1.5, 12);
  }
  deterministicScore -= index;

  return {
    candidateId: `${providerLabel}-${index}-${crypto.randomUUID()}`,
    providerLabel,
    manifestUrl,
    originalStream: stream,
    name: typeof stream.name === "string" ? stream.name : providerLabel,
    title: typeof stream.title === "string" ? stream.title : providerLabel,
    description:
      typeof stream.description === "string"
        ? stream.description
        : typeof stream.title === "string"
          ? stream.title
          : providerLabel,
    quality,
    codec,
    hdr,
    languages,
    sizeGb,
    seeders,
    isCached,
    isDebrid,
    deterministicScore,
    llmScore: null,
    finalScore: deterministicScore,
    reason: "",
  };
}

type GeminiRanking = {
  candidateId: string;
  score: number;
  reason: string;
};

function extractText(response: unknown) {
  const json = response as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function rerankWithGemini(args: {
  candidates: StreamCandidate[];
  profile: InstallProfile;
  mediaLabel: string;
}) {
  const { candidates, profile, mediaLabel } = args;
  if (!profile.gemini.apiKey || candidates.length === 0) {
    return candidates;
  }

  const prompt = [
    "Rank these Stremio stream candidates for the user.",
    "Return JSON only in the format {\"rankings\":[{\"candidateId\":\"...\",\"score\":0-100,\"reason\":\"...\"}]}",
    "Prefer streams that match the user preferences and are likely to play cleanly.",
    JSON.stringify({
      media: mediaLabel,
      preferences: profile.preferences,
      candidates: candidates.map((candidate) => ({
        candidateId: candidate.candidateId,
        providerLabel: candidate.providerLabel,
        title: candidate.title,
        quality: candidate.quality,
        codec: candidate.codec,
        hdr: candidate.hdr,
        languages: candidate.languages,
        sizeGb: candidate.sizeGb,
        seeders: candidate.seeders,
        isCached: candidate.isCached,
        isDebrid: candidate.isDebrid,
        deterministicScore: candidate.deterministicScore,
      })),
    }),
  ].join("\n\n");

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
      return candidates;
    }

    const text = extractText(await response.json());
    const parsed = JSON.parse(text) as { rankings?: GeminiRanking[] };
    const rankings = new Map(
      (parsed.rankings ?? []).map((ranking) => [ranking.candidateId, ranking]),
    );

    return candidates.map((candidate) => {
      const ranking = rankings.get(candidate.candidateId);
      if (!ranking) {
        return candidate;
      }

      return {
        ...candidate,
        llmScore: ranking.score,
        finalScore: candidate.deterministicScore + ranking.score,
        reason: ranking.reason,
      };
    });
  } catch {
    return candidates;
  }
}

export function finalizeRanking(candidates: StreamCandidate[]) {
  return candidates
    .map((candidate) => ({
      ...candidate,
      reason: candidate.reason || deterministicReason(candidate),
      finalScore: candidate.llmScore === null ? candidate.deterministicScore : candidate.finalScore,
    }))
    .sort((left, right) => right.finalScore - left.finalScore);
}
