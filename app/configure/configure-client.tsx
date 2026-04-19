"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { createProviderDraft, DEFAULT_PREFERENCES, splitCsv } from "@/lib/profile-defaults";
import { ProfilePreferences, ProviderDraft } from "@/lib/types";

type ProviderPreset = {
  key: string;
  name: string;
  description: string;
  urlHint: string;
};

export function ConfigureClient() {
  const createAnonymousProfile = useMutation(api.profiles.createAnonymousProfile);
  const saveProfile = useMutation(api.profiles.saveProfile);
  const rotateInstallToken = useMutation(api.profiles.rotateInstallToken);
  const presets = (useQuery(api.profiles.listProviderPresets) ?? []) as ProviderPreset[];

  const [manageToken, setManageToken] = useState<string | null>(null);
  const [bootstrapping, startBootstrapping] = useTransition();
  const editorProfile = useQuery(
    api.profiles.getEditorProfile,
    manageToken ? { manageToken } : "skip",
  );

  const [profileName, setProfileName] = useState("My AI Sorter Profile");
  const [providers, setProviders] = useState<ProviderDraft[]>([createProviderDraft("torrentio", 0)]);
  const [qualities, setQualities] = useState(DEFAULT_PREFERENCES.preferredQualities.join(", "));
  const [languages, setLanguages] = useState(DEFAULT_PREFERENCES.preferredLanguages.join(", "));
  const [codecs, setCodecs] = useState(DEFAULT_PREFERENCES.preferredCodecs.join(", "));
  const [maxSizeGb, setMaxSizeGb] = useState("");
  const [preferDebrid, setPreferDebrid] = useState(DEFAULT_PREFERENCES.preferDebrid);
  const [preferCached, setPreferCached] = useState(DEFAULT_PREFERENCES.preferCached);
  const [strictness, setStrictness] = useState<ProfilePreferences["strictness"]>("balanced");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-3-flash-preview");
  const [installToken, setInstallToken] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("manage");
    const tokenFromStorage = window.localStorage.getItem("ai-sorter-manage-token");
    const initialToken = tokenFromUrl || tokenFromStorage;

    if (tokenFromUrl) {
      window.history.replaceState({}, "", "/configure");
    }

    if (initialToken) {
      setManageToken(initialToken);
      return;
    }

    startBootstrapping(async () => {
      const created = await createAnonymousProfile({ name: "My AI Sorter Profile" });
      window.localStorage.setItem("ai-sorter-manage-token", created.manageToken);
      window.history.replaceState({}, "", "/configure");
      setManageToken(created.manageToken);
      setInstallToken(created.installToken);
    });
  }, [createAnonymousProfile]);

  useEffect(() => {
    if (!editorProfile) {
      return;
    }

    setProfileName(editorProfile.name);
    setProviders(editorProfile.providers.length ? editorProfile.providers : [createProviderDraft("torrentio", 0)]);
    setQualities(editorProfile.preferences.preferredQualities.join(", "));
    setLanguages(editorProfile.preferences.preferredLanguages.join(", "));
    setCodecs(editorProfile.preferences.preferredCodecs.join(", "));
    setMaxSizeGb(editorProfile.preferences.maxSizeGb ? String(editorProfile.preferences.maxSizeGb) : "");
    setPreferDebrid(editorProfile.preferences.preferDebrid);
    setPreferCached(editorProfile.preferences.preferCached);
    setStrictness(editorProfile.preferences.strictness);
    setGeminiModel(editorProfile.gemini.model);
    setInstallToken(editorProfile.installToken);
  }, [editorProfile]);

  const installUrl = useMemo(
    () => (installToken && origin ? `${origin}/install/${installToken}` : ""),
    [installToken, origin],
  );
  const manifestUrl = useMemo(
    () => (installToken && origin ? `${origin}/api/stremio/${installToken}/manifest.json` : ""),
    [installToken, origin],
  );
  const manageUrl = useMemo(
    () => (manageToken && origin ? `${origin}/configure?manage=${manageToken}` : ""),
    [manageToken, origin],
  );

  async function handleSave() {
    if (!manageToken) {
      return;
    }

    const invalidProvider = providers.find(
      (provider) =>
        provider.enabled &&
        !/^https:\/\/.+\/manifest\.json(\?.*)?$/i.test(provider.manifestUrl.trim()),
    );

    if (invalidProvider) {
      setStatus(`Invalid manifest URL for ${invalidProvider.label}. Use a public HTTPS /manifest.json URL.`);
      return;
    }

    const nextProviders = providers.map((provider, index) => ({
      ...provider,
      sortOrder: index,
      notes: provider.notes?.trim() || null,
    }));

    try {
      const response = await saveProfile({
        manageToken,
        name: profileName,
        preferences: {
          preferredQualities: splitCsv(qualities),
          preferredLanguages: splitCsv(languages),
          preferredCodecs: splitCsv(codecs),
          maxSizeGb: maxSizeGb ? Number(maxSizeGb) : null,
          preferDebrid,
          preferCached,
          strictness,
        },
        providers: nextProviders,
        geminiApiKey: geminiApiKey.trim() || null,
        geminiModel,
      });

      setInstallToken(response.installToken);
      setStatus("Profile saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save profile.");
    }
  }

  async function handleRotate() {
    if (!manageToken) {
      return;
    }

    try {
      const response = await rotateInstallToken({ manageToken });
      setInstallToken(response.installToken);
      setStatus("Install token rotated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to rotate install token.");
    }
  }

  function updateProvider(index: number, patch: Partial<ProviderDraft>) {
    setProviders((current) =>
      current.map((provider, currentIndex) =>
        currentIndex === index ? { ...provider, ...patch } : provider,
      ),
    );
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">Configure</div>
        <h1>Build a personal Stremio ranking profile</h1>
        <p>
          Add configured provider manifest URLs, set your playback preferences, then install your
          unique add-on URL into Stremio on any device.
        </p>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>Profile</h2>
          <label className="field">
            <span>Name</span>
            <input value={profileName} onChange={(event) => setProfileName(event.target.value)} />
          </label>
          <label className="field">
            <span>Gemini API key</span>
            <input
              type="password"
              placeholder="AIza..."
              value={geminiApiKey}
              onChange={(event) => setGeminiApiKey(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Gemini model</span>
            <input
              value={geminiModel}
              onChange={(event) => setGeminiModel(event.target.value)}
              placeholder="gemini-3-flash-preview"
            />
          </label>
        </article>

        <article className="panel">
          <h2>Preferences</h2>
          <label className="field">
            <span>Preferred qualities</span>
            <input value={qualities} onChange={(event) => setQualities(event.target.value)} />
          </label>
          <label className="field">
            <span>Preferred languages</span>
            <input value={languages} onChange={(event) => setLanguages(event.target.value)} />
          </label>
          <label className="field">
            <span>Preferred codecs</span>
            <input value={codecs} onChange={(event) => setCodecs(event.target.value)} />
          </label>
          <label className="field">
            <span>Maximum size in GB</span>
            <input value={maxSizeGb} onChange={(event) => setMaxSizeGb(event.target.value)} />
          </label>
          <label className="fieldInline">
            <input
              type="checkbox"
              checked={preferDebrid}
              onChange={(event) => setPreferDebrid(event.target.checked)}
            />
            <span>Prefer debrid-backed streams</span>
          </label>
          <label className="fieldInline">
            <input
              type="checkbox"
              checked={preferCached}
              onChange={(event) => setPreferCached(event.target.checked)}
            />
            <span>Prefer cached streams</span>
          </label>
          <label className="field">
            <span>Ranking mode</span>
            <select
              value={strictness}
              onChange={(event) => setStrictness(event.target.value as ProfilePreferences["strictness"])}
            >
              <option value="balanced">Balanced</option>
              <option value="quality-first">Quality first</option>
              <option value="speed-first">Speed first</option>
            </select>
          </label>
        </article>
      </section>

      <section className="panel" style={{ marginTop: 24 }}>
        <h2>Providers</h2>
        <p>Paste fully configured add-on manifest URLs. Presets are labels and hints, not hosted credentials.</p>
        {providers.map((provider, index) => (
          <div className="providerCard" key={`${provider.presetKey}-${index}`}>
            <label className="field">
              <span>Preset</span>
              <select
                value={provider.presetKey}
                onChange={(event) => updateProvider(index, { presetKey: event.target.value })}
              >
                {presets.map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Label</span>
              <input
                value={provider.label}
                onChange={(event) => updateProvider(index, { label: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Manifest URL</span>
              <input
                value={provider.manifestUrl}
                placeholder={
                  presets.find((preset) => preset.key === provider.presetKey)?.urlHint ??
                  "https://example.com/manifest.json"
                }
                onChange={(event) => updateProvider(index, { manifestUrl: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Notes</span>
              <input
                value={provider.notes ?? ""}
                onChange={(event) => updateProvider(index, { notes: event.target.value })}
              />
            </label>
            <label className="fieldInline">
              <input
                type="checkbox"
                checked={provider.enabled}
                onChange={(event) => updateProvider(index, { enabled: event.target.checked })}
              />
              <span>Enabled</span>
            </label>
            <button
              className="button secondary"
              type="button"
              onClick={() =>
                setProviders((current) => current.filter((_, currentIndex) => currentIndex !== index))
              }
            >
              Remove provider
            </button>
          </div>
        ))}
        <div className="ctaRow">
          <button
            className="button secondary"
            type="button"
            onClick={() => setProviders((current) => [...current, createProviderDraft("custom", current.length)])}
          >
            Add provider
          </button>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 24 }}>
        <h2>Install</h2>
        <label className="field">
          <span>Manage URL</span>
          <input readOnly value={manageUrl} />
        </label>
        <label className="field">
          <span>Install page</span>
          <input readOnly value={installUrl} />
        </label>
        <label className="field">
          <span>Manifest URL</span>
          <input readOnly value={manifestUrl} />
        </label>
        <div className="ctaRow">
          <button className="button primary" type="button" disabled={bootstrapping} onClick={handleSave}>
            Save profile
          </button>
          <button className="button secondary" type="button" disabled={!manageToken} onClick={handleRotate}>
            Rotate install token
          </button>
        </div>
        {status ? <p>{status}</p> : null}
      </section>
    </main>
  );
}
