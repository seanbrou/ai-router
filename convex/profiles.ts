import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";

const preferenceValidator = v.object({
  preferredQualities: v.array(v.string()),
  preferredLanguages: v.array(v.string()),
  preferredCodecs: v.array(v.string()),
  maxSizeGb: v.union(v.number(), v.null()),
  preferDebrid: v.boolean(),
  preferCached: v.boolean(),
  strictness: v.union(
    v.literal("balanced"),
    v.literal("quality-first"),
    v.literal("speed-first"),
    v.literal("custom-prompt"),
  ),
  customPrompt: v.optional(v.union(v.string(), v.null())),
});

const providerInputValidator = v.object({
  presetKey: v.string(),
  label: v.string(),
  manifestUrl: v.string(),
  notes: v.union(v.string(), v.null()),
  enabled: v.boolean(),
  sortOrder: v.number(),
});

const providerPresetValidator = v.object({
  key: v.string(),
  name: v.string(),
  description: v.string(),
  urlHint: v.string(),
});

const editorProfileValidator = v.object({
  manageToken: v.string(),
  installToken: v.string(),
  name: v.string(),
  preferences: preferenceValidator,
  providers: v.array(providerInputValidator),
  gemini: v.object({
    hasApiKey: v.boolean(),
    model: v.string(),
  }),
});

const installProfileValidator = v.object({
  name: v.string(),
  installToken: v.string(),
  preferences: preferenceValidator,
  providers: v.array(providerInputValidator),
  gemini: v.object({
    apiKey: v.union(v.string(), v.null()),
    model: v.string(),
  }),
});

function now() {
  return Date.now();
}

function makeToken(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function defaultPreferences() {
  return {
    preferredQualities: ["2160p", "1080p", "720p"],
    preferredLanguages: ["en"],
    preferredCodecs: ["HEVC", "AV1", "AVC"],
    maxSizeGb: null,
    preferDebrid: true,
    preferCached: true,
    strictness: "balanced" as const,
    customPrompt: null,
  };
}

function getProviderPresets() {
  return [
    {
      key: "torrentio",
      name: "Torrentio",
      description: "Uses the default Torrentio manifest automatically. You can still override it with a custom manifest URL.",
      urlHint: "https://torrentio.strem.fun/manifest.json",
    },
    {
      key: "debridio",
      name: "Debridio",
      description: "Enter your Debridio API key plus provider credentials, or paste a fully configured Debridio manifest URL.",
      urlHint: "https://addon.debridio.com/<encoded-config>/manifest.json",
    },
    {
      key: "comet",
      name: "Comet",
      description: "Torrent/debrid addon. Works out of the box for public torrents, or paste a debrid-configured manifest URL.",
      urlHint: "https://comet.elfhosted.com/manifest.json",
    },
    {
      key: "mediafusion",
      name: "MediaFusion",
      description: "All-in-one addon: torrents, live TV, sports, and more. Works out of the box with sensible defaults.",
      urlHint: "https://mediafusion.elfhosted.com/manifest.json",
    },
    {
      key: "torbox",
      name: "TorBox",
      description: "TorBox debrid addon. Enter your TorBox API key for cached torrent streams.",
      urlHint: "https://torbox.app/manifest.json",
    },
    {
      key: "custom",
      name: "Custom compatible add-on",
      description: "Paste any compatible Stremio add-on manifest URL.",
      urlHint: "https://example.com/manifest.json",
    },
  ];
}

async function getInstallTokenByProfileId(ctx: { db: any }, profileId: string) {
  const token = await ctx.db
    .query("profileInstallTokens")
    .withIndex("by_profileId_and_isActive", (q: any) =>
      q.eq("profileId", profileId).eq("isActive", true),
    )
    .unique();

  return token ?? null;
}

async function getProvidersByProfileId(ctx: { db: any }, profileId: string) {
  return await ctx.db
    .query("streamProviders")
    .withIndex("by_profileId_and_sortOrder", (q: any) => q.eq("profileId", profileId))
    .collect();
}

async function getSecretByProfileId(ctx: { db: any }, profileId: string) {
  return await ctx.db
    .query("profileSecrets")
    .withIndex("by_profileId", (q: any) => q.eq("profileId", profileId))
    .unique();
}

export const listProviderPresets = query({
  args: {},
  returns: v.array(providerPresetValidator),
  handler: async () => getProviderPresets(),
});

export const createAnonymousProfile = mutation({
  args: {
    name: v.optional(v.string()),
  },
  returns: v.object({
    manageToken: v.string(),
    installToken: v.string(),
  }),
  handler: async (ctx, args) => {
    const timestamp = now();
    const manageToken = makeToken("manage");
    const installToken = makeToken("install");

    const profileId = await ctx.db.insert("streamProfiles", {
      ownerKey: null,
      manageToken,
      name: args.name?.trim() || "My AI Sorter Profile",
      preferences: defaultPreferences(),
      isAnonymous: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await ctx.db.insert("profileInstallTokens", {
      profileId,
      token: installToken,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await ctx.db.insert("profileSecrets", {
      profileId,
      geminiApiKey: null,
      geminiModel: "gemini-3-flash-preview",
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return { manageToken, installToken };
  },
});

export const getEditorProfile = query({
  args: {
    manageToken: v.string(),
  },
  returns: v.union(editorProfileValidator, v.null()),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("streamProfiles")
      .withIndex("by_manageToken", (q: any) => q.eq("manageToken", args.manageToken))
      .unique();

    if (!profile) {
      return null;
    }

    const installToken = await getInstallTokenByProfileId(ctx, profile._id);
    const secret = await getSecretByProfileId(ctx, profile._id);
    const providers = await getProvidersByProfileId(ctx, profile._id);

    return {
      manageToken: profile.manageToken,
      installToken: installToken?.token ?? "",
      name: profile.name,
      preferences: profile.preferences,
      providers: providers.map((provider: any) => ({
        presetKey: provider.presetKey,
        label: provider.label,
        manifestUrl: provider.manifestUrl,
        notes: provider.notes ?? null,
        enabled: provider.enabled,
        sortOrder: provider.sortOrder,
      })),
      gemini: {
        hasApiKey: Boolean(secret?.geminiApiKey),
        model: secret?.geminiModel ?? "gemini-3-flash-preview",
      },
    };
  },
});

export const saveProfile = mutation({
  args: {
    manageToken: v.string(),
    name: v.string(),
    preferences: preferenceValidator,
    providers: v.array(providerInputValidator),
    geminiApiKey: v.union(v.string(), v.null()),
    geminiModel: v.string(),
  },
  returns: v.object({
    installToken: v.string(),
  }),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("streamProfiles")
      .withIndex("by_manageToken", (q: any) => q.eq("manageToken", args.manageToken))
      .unique();

    if (!profile) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Profile not found.",
      });
    }

    const timestamp = now();
    await ctx.db.patch(profile._id, {
      name: args.name.trim() || "My AI Sorter Profile",
      preferences: args.preferences,
      updatedAt: timestamp,
    });

    const existingProviders = await getProvidersByProfileId(ctx, profile._id);
    await Promise.all(existingProviders.map((provider: any) => ctx.db.delete(provider._id)));

    for (const provider of args.providers) {
      await ctx.db.insert("streamProviders", {
        profileId: profile._id,
        presetKey: provider.presetKey,
        label: provider.label,
        manifestUrl: provider.manifestUrl,
        notes: provider.notes,
        enabled: provider.enabled,
        sortOrder: provider.sortOrder,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    const secret = await getSecretByProfileId(ctx, profile._id);
    if (secret) {
      await ctx.db.patch(secret._id, {
        geminiApiKey: args.geminiApiKey,
        geminiModel: args.geminiModel.trim() || "gemini-3-flash-preview",
        updatedAt: timestamp,
      });
    } else {
      await ctx.db.insert("profileSecrets", {
        profileId: profile._id,
        geminiApiKey: args.geminiApiKey,
        geminiModel: args.geminiModel.trim() || "gemini-3-flash-preview",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    let installToken = await getInstallTokenByProfileId(ctx, profile._id);
    if (!installToken) {
      const token = makeToken("install");
      const installTokenId = await ctx.db.insert("profileInstallTokens", {
        profileId: profile._id,
        token,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      installToken = await ctx.db.get(installTokenId);
    }

    return { installToken: installToken?.token ?? "" };
  },
});

export const rotateInstallToken = mutation({
  args: {
    manageToken: v.string(),
  },
  returns: v.object({
    installToken: v.string(),
  }),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("streamProfiles")
      .withIndex("by_manageToken", (q: any) => q.eq("manageToken", args.manageToken))
      .unique();

    if (!profile) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Profile not found.",
      });
    }

    const timestamp = now();
    const tokens = await ctx.db
      .query("profileInstallTokens")
      .withIndex("by_profileId_and_isActive", (q: any) =>
        q.eq("profileId", profile._id).eq("isActive", true),
      )
      .collect();

    await Promise.all(
      tokens
        .filter((token: any) => token.isActive)
        .map((token: any) =>
          ctx.db.patch(token._id, {
            isActive: false,
            updatedAt: timestamp,
          }),
        ),
    );

    const installToken = makeToken("install");
    await ctx.db.insert("profileInstallTokens", {
      profileId: profile._id,
      token: installToken,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return { installToken };
  },
});

export const getInstallProfile = query({
  args: {
    installToken: v.string(),
  },
  returns: v.union(installProfileValidator, v.null()),
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("profileInstallTokens")
      .withIndex("by_token", (q: any) => q.eq("token", args.installToken))
      .unique();

    if (!token || !token.isActive) {
      return null;
    }

    const profile = await ctx.db.get(token.profileId);
    if (!profile) {
      return null;
    }

    const providers = await getProvidersByProfileId(ctx, profile._id);
    const secret = await getSecretByProfileId(ctx, profile._id);

    return {
      name: profile.name,
      installToken: token.token,
      preferences: profile.preferences,
      providers: providers.map((provider: any) => ({
        presetKey: provider.presetKey,
        label: provider.label,
        manifestUrl: provider.manifestUrl,
        notes: provider.notes ?? null,
        enabled: provider.enabled,
        sortOrder: provider.sortOrder,
      })),
      gemini: {
        apiKey: secret?.geminiApiKey ?? null,
        model: secret?.geminiModel ?? "gemini-3-flash-preview",
      },
    };
  },
});

export const logRankingRun = mutation({
  args: {
    installToken: v.string(),
    requestKey: v.string(),
    mediaType: v.string(),
    mediaId: v.string(),
    model: v.string(),
    providerCount: v.number(),
    streamCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("profileInstallTokens")
      .withIndex("by_token", (q: any) => q.eq("token", args.installToken))
      .unique();

    if (!token || !token.isActive) {
      return null;
    }

    await ctx.db.insert("rankingLogs", {
      profileId: token.profileId,
      requestKey: args.requestKey,
      mediaType: args.mediaType,
      mediaId: args.mediaId,
      model: args.model,
      providerCount: args.providerCount,
      streamCount: args.streamCount,
      createdAt: now(),
    });

    return null;
  },
});
