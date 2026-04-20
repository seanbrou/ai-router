import { NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type RouteProps = {
  params: Promise<{
    profileToken: string;
  }>;
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(request: Request, { params }: RouteProps) {
  const { profileToken } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;

  try {
    const convex = getConvexServerClient();
    const profile = await convex.query(api.profiles.getInstallProfile, {
      installToken: profileToken,
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found." },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    const manifest = {
      id: `${process.env.STREMIO_ADDON_ID ?? "com.aisorter"}.${profileToken.slice(0, 8)}`,
      version: "1.0.0",
      name: `${process.env.STREMIO_ADDON_NAME ?? "AI Sorter"} · ${profile.name}`,
      description: "Aggregates compatible Stremio providers and reranks streams using Gemini plus your preferences.",
      logo: `${appUrl}/logo.png`,
      resources: ["stream"],
      types: ["movie", "series"],
      idPrefixes: ["tt", "kitsu", "imdb"],
      catalogs: [],
      behaviorHints: {
        configurable: false,
        configurationRequired: false,
        p2p: true,
      },
      links: [
        {
          name: "Configure",
          category: "configure",
          url: `${appUrl}/configure`,
        },
        {
          name: "Install",
          category: "other",
          url: `${appUrl}/install/${profileToken}`,
        },
      ],
    };

    return NextResponse.json(manifest, { headers: CORS_HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Backend unavailable. Start Convex locally or configure a live deployment." },
      { status: 503, headers: CORS_HEADERS },
    );
  }
}
