import { NextResponse } from "next/server";
import { api } from "../../../../../../../convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";
import { enrichMediaMetadata } from "@/lib/metadata";
import { fetchProviderStreams } from "@/lib/provider-fetch";
import { finalizeRanking, normalizeStreamCandidate, rerankWithGemini } from "@/lib/stream-ranking";
import { ProviderDraft } from "@/lib/types";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type RouteProps = {
  params: Promise<{
    profileToken: string;
    type: string;
    id: string;
  }>;
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(_: Request, { params }: RouteProps) {
  const { profileToken, type, id } = await params;

  try {
    const convex = getConvexServerClient();
    const profile = await convex.query(api.profiles.getInstallProfile, {
      installToken: profileToken,
    });

    if (!profile) {
      return NextResponse.json({ streams: [] }, { status: 200, headers: CORS_HEADERS });
    }

    const metadata = await enrichMediaMetadata(type, id);
    const enabledProviders = profile.providers.filter(
      (provider: ProviderDraft) => provider.enabled && provider.manifestUrl.trim().length > 0,
    );

    if (enabledProviders.length === 0) {
      return NextResponse.json({ streams: [] }, { status: 200, headers: CORS_HEADERS });
    }

    const providerResponses = await Promise.allSettled(
      enabledProviders.map(async (provider: ProviderDraft, providerIndex: number) => ({
        provider,
        providerIndex,
        response: await fetchProviderStreams(provider, type, id),
      })),
    );

    const normalized = providerResponses.flatMap((result: PromiseSettledResult<{
      provider: ProviderDraft;
      providerIndex: number;
      response: {
        streamUrl: string;
        streams: Record<string, unknown>[];
      };
    }>) => {
      if (result.status !== "fulfilled") {
        return [];
      }

      return result.value.response.streams.map((stream: Record<string, unknown>, index: number) =>
        normalizeStreamCandidate(
          result.value.provider.label,
          result.value.provider.manifestUrl,
          stream,
          profile.preferences,
          index,
          result.value.providerIndex,
        ),
      );
    });

    const mediaLabel = [metadata.title, metadata.year, metadata.season, metadata.episode]
      .filter((value) => value !== null && value !== undefined && value !== "")
      .join(" ");

    const reranked = await rerankWithGemini({
      candidates: normalized,
      profile,
      mediaLabel: mediaLabel || `${type} ${id}`,
    });
    const ranked = finalizeRanking(reranked);

    await convex.mutation(api.profiles.logRankingRun, {
      installToken: profileToken,
      requestKey: `${type}:${id}:${Date.now()}`,
      mediaType: type,
      mediaId: id,
      model: profile.gemini.model,
      providerCount: enabledProviders.length,
      streamCount: ranked.length,
    });

    const streams = ranked.map((candidate) => {
      // Preserve all original stream fields and only override display labels
      const stream = candidate.originalStream;
      const qualityLabel = candidate.quality ?? "Auto";
      const name = `${candidate.providerLabel} · ${qualityLabel}`;
      const title = candidate.reason || candidate.title || candidate.providerLabel;

      return {
        ...stream,
        name,
        title,
      };
    });

    return NextResponse.json({ streams }, { status: 200, headers: CORS_HEADERS });
  } catch {
    return NextResponse.json(
      { streams: [] },
      { status: 200, headers: CORS_HEADERS },
    );
  }
}
