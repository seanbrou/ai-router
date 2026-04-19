import { NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";

type RouteProps = {
  params: Promise<{
    profileToken: string;
  }>;
};

export async function GET(request: Request, { params }: RouteProps) {
  const { profileToken } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;
  try {
    const convex = getConvexServerClient();
    const profile = await convex.query(api.profiles.getInstallProfile, {
      installToken: profileToken,
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    return NextResponse.json({
      id: `${process.env.STREMIO_ADDON_ID ?? "com.example.ai-sorter"}.${profileToken.slice(0, 8)}`,
      version: "0.1.0",
      name: `${process.env.STREMIO_ADDON_NAME ?? "AI Sorter"} · ${profile.name}`,
      description: "Aggregates compatible Stremio providers and reranks streams using Gemini plus user preferences.",
      resources: ["stream"],
      types: ["movie", "series"],
      catalogs: [],
      behaviorHints: {
        configurable: true,
        configurationRequired: true,
        p2p: true,
      },
      links: [
        {
          name: "Configure",
          url: `${appUrl}/configure`,
        },
        {
          name: "Install",
          url: `${appUrl}/install/${profileToken}`,
        },
      ],
    });
  } catch {
    return NextResponse.json(
      { error: "Backend unavailable. Start Convex locally or configure a live deployment." },
      { status: 503 },
    );
  }
}
