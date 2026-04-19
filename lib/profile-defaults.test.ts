import { describe, expect, test } from "vitest";
import { applyProfilePreset, DEFAULT_PREFERENCES } from "./profile-defaults";

describe("applyProfilePreset", () => {
  test("returns preset-specific preferences for Movie Night", () => {
    const preset = applyProfilePreset("Movie Night");

    expect(preset.strictness).toBe("quality-first");
    expect(preset.preferredQualities).toEqual(["2160p", "1080p"]);
    expect(preset.preferDebrid).toBe(true);
  });

  test("falls back to defaults for unknown presets", () => {
    const preset = applyProfilePreset("Unknown");

    expect(preset).toEqual(DEFAULT_PREFERENCES);
  });
});
