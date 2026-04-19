import { describe, expect, test } from "vitest";
import { manifestUrlToStreamUrl } from "./provider-fetch";

describe("manifestUrlToStreamUrl", () => {
  test("replaces manifest path with stream path", () => {
    expect(
      manifestUrlToStreamUrl(
        "https://torrentio.strem.fun/some-config/manifest.json",
        "movie",
        "tt1234567",
      ),
    ).toBe("https://torrentio.strem.fun/some-config/stream/movie/tt1234567.json");
  });

  test("rejects provider urls that do not end in manifest.json", () => {
    expect(() => manifestUrlToStreamUrl("https://example.com/addon", "series", "tt123:1:2")).toThrow(
      /manifest\.json/i,
    );
  });
});
