import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
  ),
});

export default defineSchema({
  streamProfiles: defineTable({
    ownerKey: v.union(v.string(), v.null()),
    manageToken: v.string(),
    name: v.string(),
    preferences: preferenceValidator,
    isAnonymous: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_manageToken", ["manageToken"])
    .index("by_ownerKey", ["ownerKey"]),

  profileInstallTokens: defineTable({
    profileId: v.id("streamProfiles"),
    token: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_profileId", ["profileId"])
    .index("by_profileId_and_isActive", ["profileId", "isActive"])
    .index("by_token", ["token"]),

  streamProviders: defineTable({
    profileId: v.id("streamProfiles"),
    presetKey: v.string(),
    label: v.string(),
    manifestUrl: v.string(),
    notes: v.union(v.string(), v.null()),
    enabled: v.boolean(),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_profileId_and_sortOrder", ["profileId", "sortOrder"]),

  profileSecrets: defineTable({
    profileId: v.id("streamProfiles"),
    geminiApiKey: v.union(v.string(), v.null()),
    geminiModel: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_profileId", ["profileId"]),

  rankingLogs: defineTable({
    profileId: v.id("streamProfiles"),
    requestKey: v.string(),
    mediaType: v.string(),
    mediaId: v.string(),
    model: v.string(),
    providerCount: v.number(),
    streamCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_profileId_and_createdAt", ["profileId", "createdAt"])
    .index("by_requestKey", ["requestKey"]),
});
