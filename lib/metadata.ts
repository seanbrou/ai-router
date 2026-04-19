type ParsedMediaIdentity = {
  baseId: string;
  season: number | null;
  episode: number | null;
};

export type MediaMetadata = {
  id: string;
  type: string;
  title: string | null;
  year: number | null;
  season: number | null;
  episode: number | null;
};

function parseMediaIdentity(id: string): ParsedMediaIdentity {
  const parts = id.split(":");
  if (parts.length >= 3) {
    const season = Number(parts[1]);
    const episode = Number(parts[2]);
    return {
      baseId: parts[0],
      season: Number.isFinite(season) ? season : null,
      episode: Number.isFinite(episode) ? episode : null,
    };
  }

  return {
    baseId: id,
    season: null,
    episode: null,
  };
}

export async function enrichMediaMetadata(type: string, id: string): Promise<MediaMetadata> {
  const parsed = parseMediaIdentity(id);
  const result: MediaMetadata = {
    id,
    type,
    title: null,
    year: null,
    season: parsed.season,
    episode: parsed.episode,
  };

  try {
    const response = await fetch(
      `https://v3-cinemeta.strem.io/meta/${encodeURIComponent(type)}/${encodeURIComponent(parsed.baseId)}.json`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return result;
    }

    const json = (await response.json()) as {
      meta?: {
        name?: string;
        year?: string | number;
      };
    };

    return {
      ...result,
      title: json.meta?.name ?? null,
      year:
        typeof json.meta?.year === "number"
          ? json.meta.year
          : typeof json.meta?.year === "string"
            ? Number.parseInt(json.meta.year, 10) || null
            : null,
    };
  } catch {
    return result;
  }
}
