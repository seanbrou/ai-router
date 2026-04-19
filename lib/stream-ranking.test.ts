import { describe, expect, test } from "vitest";
import { finalizeRanking, normalizeStreamCandidate } from "./stream-ranking";
import { DEFAULT_PREFERENCES } from "./profile-defaults";

describe("normalizeStreamCandidate", () => {
  test("extracts playback signals from provider stream text", () => {
    const candidate = normalizeStreamCandidate(
      "Torrentio",
      "https://example.com/manifest.json",
      {
        name: "Torrentio 4K",
        title: "2160p HEVC HDR cached Real-Debrid 12 GB seeders 54",
        description: "English multi audio",
      },
      DEFAULT_PREFERENCES,
      0,
      0,
    );

    expect(candidate.quality).toBe("2160p");
    expect(candidate.codec).toBe("HEVC");
    expect(candidate.hdr).toBe("HDR");
    expect(candidate.isCached).toBe(true);
    expect(candidate.isDebrid).toBe(true);
    expect(candidate.languages).toContain("en");
    expect(candidate.sizeGb).toBe(12);
  });
});

describe("finalizeRanking", () => {
  test("sorts by final score descending", () => {
    const ranked = finalizeRanking([
      {
        candidateId: "a",
        providerLabel: "One",
        manifestUrl: "https://example.com/manifest.json",
        providerPriority: 0,
        originalStream: {},
        name: "A",
        title: "A",
        description: "A",
        quality: "1080p",
        codec: "HEVC",
        hdr: null,
        languages: ["en"],
        sizeGb: 4,
        seeders: 12,
        isCached: true,
        isDebrid: true,
        deterministicScore: 40,
        llmScore: 15,
        finalScore: 55,
        reason: "",
      },
      {
        candidateId: "b",
        providerLabel: "Two",
        manifestUrl: "https://example.com/manifest.json",
        providerPriority: 1,
        originalStream: {},
        name: "B",
        title: "B",
        description: "B",
        quality: "720p",
        codec: "AVC",
        hdr: null,
        languages: ["en"],
        sizeGb: 2,
        seeders: 5,
        isCached: false,
        isDebrid: false,
        deterministicScore: 30,
        llmScore: null,
        finalScore: 30,
        reason: "",
      },
    ]);

    expect(ranked[0]?.candidateId).toBe("a");
    expect(ranked[1]?.candidateId).toBe("b");
  });

  test("deduplicates identical underlying streams and keeps the higher score", () => {
    const ranked = finalizeRanking([
      {
        candidateId: "a",
        providerLabel: "One",
        manifestUrl: "https://example.com/manifest.json",
        providerPriority: 0,
        originalStream: { infoHash: "ABC123" },
        name: "A",
        title: "A",
        description: "A",
        quality: "1080p",
        codec: "HEVC",
        hdr: null,
        languages: ["en"],
        sizeGb: 4,
        seeders: 12,
        isCached: true,
        isDebrid: true,
        deterministicScore: 40,
        llmScore: 15,
        finalScore: 55,
        reason: "",
      },
      {
        candidateId: "b",
        providerLabel: "Two",
        manifestUrl: "https://example.com/manifest.json",
        providerPriority: 1,
        originalStream: { infoHash: "ABC123" },
        name: "B",
        title: "B",
        description: "B",
        quality: "1080p",
        codec: "HEVC",
        hdr: null,
        languages: ["en"],
        sizeGb: 4,
        seeders: 12,
        isCached: true,
        isDebrid: true,
        deterministicScore: 30,
        llmScore: 10,
        finalScore: 40,
        reason: "",
      },
    ]);

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.candidateId).toBe("a");
  });
});
