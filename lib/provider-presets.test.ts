import { describe, expect, test } from "vitest";
import {
  buildDebridioManifestUrl,
  hydrateProviderDraft,
  normalizeProviderDraftForSave,
  TORRENTIO_DEFAULT_MANIFEST_URL,
} from "./provider-presets";
import { createProviderDraft } from "./profile-defaults";

describe("provider preset helpers", () => {
  test("hydrates torrentio with the one-click manifest", () => {
    const draft = hydrateProviderDraft({
      ...createProviderDraft("torrentio", 0),
      manifestUrl: "",
    });

    expect(draft.manifestUrl).toBe(TORRENTIO_DEFAULT_MANIFEST_URL);
  });

  test("builds a debridio manifest from api keys", () => {
    const manifestUrl = buildDebridioManifestUrl({
      addonApiKey: "debridio-key",
      provider: "realdebrid",
      providerApiKey: "provider-key",
      disableUncached: false,
      maxSize: "",
      maxReturnPerQuality: "",
      resolutions: ["4k", "1080p"],
      excludedQualities: ["CAM"],
    });

    expect(manifestUrl).toMatch(/^https:\/\/addon\.debridio\.com\/.+\/manifest\.json$/);
  });

  test("normalizes debridio drafts for save", () => {
    const draft = createProviderDraft("debridio", 1);
    draft.config = {
      debridio: {
        addonApiKey: "debridio-key",
        provider: "realdebrid",
        providerApiKey: "provider-key",
        disableUncached: false,
        maxSize: "",
        maxReturnPerQuality: "",
        resolutions: ["4k", "1080p"],
        excludedQualities: ["CAM"],
      },
    };

    const normalized = normalizeProviderDraftForSave(draft);

    expect(normalized.error).toBeUndefined();
    expect(normalized.provider?.manifestUrl).toMatch(
      /^https:\/\/addon\.debridio\.com\/.+\/manifest\.json$/,
    );
    expect(normalized.provider?.notes).toContain("provider-config");
  });
});
