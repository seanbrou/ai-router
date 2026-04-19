"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { createProviderDraft, DEFAULT_PREFERENCES } from "@/lib/profile-defaults";
import { ProfilePreferences, ProviderDraft } from "@/lib/types";
import {
  QUALITY_OPTIONS,
  LANGUAGE_OPTIONS,
  CODEC_OPTIONS,
  SIZE_OPTIONS,
  GEMINI_MODEL_OPTIONS,
  PROFILE_NAME_OPTIONS,
  PROVIDER_PRESET_OPTIONS,
} from "@/lib/profile-defaults";

type ProviderPreset = {
  key: string;
  name: string;
  description: string;
  urlHint: string;
};

/* ── Multi-select chip group ────────────────────────────────────────── */
function ChipGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (vals: string[]) => void;
}) {
  function toggle(val: string) {
    onChange(
      selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val],
    );
  }
  return (
    <div className="field">
      <span className="fieldLabel">{label}</span>
      <div className="chipGroup">
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              className={`chip ${active ? "active" : ""}`}
              onClick={() => toggle(opt.value)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Copy row ───────────────────────────────────────────────────────── */
function CopyRow({
  label,
  url,
  onCopy,
  copied,
}: {
  label: string;
  url: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="urlRow">
      <div className="urlInfo">
        <span className="urlLabel">{label}</span>
        <code className="urlText">{url}</code>
      </div>
      <button className="btnCopy" type="button" onClick={onCopy}>
        {copied ? "✓" : "Copy"}
      </button>
    </div>
  );
}

/* ── Main configure page ────────────────────────────────────────────── */
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

  // Profile
  const [profilePreset, setProfilePreset] = useState("custom");
  const [profileName, setProfileName] = useState("My AI Sorter Profile");

  // Gemini
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-3-flash-preview");

  // Preferences
  const [qualities, setQualities] = useState<string[]>(DEFAULT_PREFERENCES.preferredQualities);
  const [languages, setLanguages] = useState<string[]>(DEFAULT_PREFERENCES.preferredLanguages);
  const [codecs, setCodecs] = useState<string[]>(DEFAULT_PREFERENCES.preferredCodecs);
  const [maxSizeGb, setMaxSizeGb] = useState<string>("");
  const [preferDebrid, setPreferDebrid] = useState(DEFAULT_PREFERENCES.preferDebrid);
  const [preferCached, setPreferCached] = useState(DEFAULT_PREFERENCES.preferCached);
  const [strictness, setStrictness] = useState<ProfilePreferences["strictness"]>("balanced");

  // Providers
  const [providers, setProviders] = useState<ProviderDraft[]>([createProviderDraft("torrentio", 0)]);

  // Meta
  const [installToken, setInstallToken] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  /* ── Bootstrap ─────────────────────────────────────────────────────── */
  useEffect(() => {
    setOrigin(window.location.origin);
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("manage");
    const tokenFromStorage = window.localStorage.getItem("ai-sorter-manage-token");
    const initialToken = tokenFromUrl || tokenFromStorage;

    if (tokenFromUrl) window.history.replaceState({}, "", "/configure");
    if (initialToken) {
      setManageToken(initialToken);
      return;
    }

    startBootstrapping(async () => {
      const created = await createAnonymousProfile({ name: "My AI Sorter Profile" });
      window.localStorage.setItem("ai-sorter-manage-token", created.manageToken);
      setManageToken(created.manageToken);
      setInstallToken(created.installToken);
    });
  }, [createAnonymousProfile]);

  useEffect(() => {
    if (!editorProfile) return;
    setProfileName(editorProfile.name);
    setProfilePreset(
      PROFILE_NAME_OPTIONS.find((o) => o.value === editorProfile.name)?.value ?? "custom",
    );
    setProviders(
      editorProfile.providers.length
        ? editorProfile.providers
        : [createProviderDraft("torrentio", 0)],
    );
    setQualities(editorProfile.preferences.preferredQualities);
    setLanguages(editorProfile.preferences.preferredLanguages);
    setCodecs(editorProfile.preferences.preferredCodecs);
    setMaxSizeGb(
      editorProfile.preferences.maxSizeGb ? String(editorProfile.preferences.maxSizeGb) : "",
    );
    setPreferDebrid(editorProfile.preferences.preferDebrid);
    setPreferCached(editorProfile.preferences.preferCached);
    setStrictness(editorProfile.preferences.strictness);
    setGeminiModel(editorProfile.gemini.model);
    setInstallToken(editorProfile.installToken);
  }, [editorProfile]);

  useEffect(() => {
    if (profilePreset !== "custom") {
      const found = PROFILE_NAME_OPTIONS.find((o) => o.value === profilePreset);
      if (found) setProfileName(found.value);
    }
  }, [profilePreset]);

  /* ── URLs ──────────────────────────────────────────────────────────── */
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

  /* ── Handlers ──────────────────────────────────────────────────────── */
  async function handleSave() {
    if (!manageToken) return;

    const invalidProvider = providers.find(
      (p) => p.enabled && !/^https:\/\/.+\/manifest\.json(\?.*)?$/i.test(p.manifestUrl.trim()),
    );
    if (invalidProvider) {
      setStatus(`Invalid manifest URL for ${invalidProvider.label}.`);
      return;
    }

    try {
      const response = await saveProfile({
        manageToken,
        name: profileName,
        preferences: {
          preferredQualities: qualities,
          preferredLanguages: languages,
          preferredCodecs: codecs,
          maxSizeGb: maxSizeGb ? Number(maxSizeGb) : null,
          preferDebrid,
          preferCached,
          strictness,
        },
        providers: providers.map((p, i) => ({ ...p, sortOrder: i, notes: p.notes?.trim() || null })),
        geminiApiKey: geminiApiKey.trim() || null,
        geminiModel,
      });
      setInstallToken(response.installToken);
      setStatus("Profile saved");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save.");
    }
  }

  async function handleRotate() {
    if (!manageToken) return;
    try {
      const response = await rotateInstallToken({ manageToken });
      setInstallToken(response.installToken);
      setStatus("Token rotated");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to rotate.");
    }
  }

  function updateProvider(index: number, patch: Partial<ProviderDraft>) {
    setProviders((cur) =>
      cur.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );
  }

  function addProvider() {
    setProviders((cur) => [...cur, createProviderDraft("torrentio", cur.length)]);
  }

  function removeProvider(index: number) {
    setProviders((cur) => cur.filter((_, i) => i !== index));
  }

  function copyUrl(url: string, label: string) {
    navigator.clipboard.writeText(url);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  function resolveManifestUrl(presetKey: string): string {
    const p = presets.find((x) => x.key === presetKey);
    return p?.urlHint ?? "";
  }

  /* ── Render ────────────────────────────────────────────────────────── */
  return (
    <main className="shell">
      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="topBar">
        <div className="topBarInner">
          <span className="logo">
            <span className="logoMark">◆</span>
            AI Sorter
          </span>
          <span className="version">v1.0</span>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="badge">
          <span className="badgeDot" />
          Stremio Add-on
        </div>
        <h1>Configure your AI stream sorter</h1>
        <p>
          Pick your preferences below. Save to generate your personal add-on URL for Stremio.
        </p>
      </section>

      {/* ── Profile + Preferences ────────────────────────────────── */}
      <section className="grid">
        <article className="panel">
          <h2>Profile</h2>

          <label className="field">
            <span className="fieldLabel">Profile preset</span>
            <select value={profilePreset} onChange={(e) => setProfilePreset(e.target.value)}>
              {PROFILE_NAME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="fieldLabel">AI model</span>
            <select value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)}>
              {GEMINI_MODEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="fieldLabel">Gemini API key</span>
            <input
              type="password"
              placeholder="AIza..."
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
            />
          </label>
        </article>

        <article className="panel">
          <h2>Preferences</h2>

          <ChipGroup
            label="Qualities"
            options={QUALITY_OPTIONS}
            selected={qualities}
            onChange={setQualities}
          />

          <ChipGroup
            label="Languages"
            options={LANGUAGE_OPTIONS}
            selected={languages}
            onChange={setLanguages}
          />

          <ChipGroup
            label="Codecs"
            options={CODEC_OPTIONS}
            selected={codecs}
            onChange={setCodecs}
          />

          <label className="field">
            <span className="fieldLabel">Max file size</span>
            <select value={maxSizeGb} onChange={(e) => setMaxSizeGb(e.target.value)}>
              {SIZE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="fieldLabel">Ranking strategy</span>
            <select
              value={strictness}
              onChange={(e) => setStrictness(e.target.value as ProfilePreferences["strictness"])}
            >
              <option value="balanced">Balanced</option>
              <option value="quality-first">Quality first</option>
              <option value="speed-first">Speed first</option>
            </select>
          </label>

          <label className="fieldInline">
            <input
              type="checkbox"
              checked={preferDebrid}
              onChange={(e) => setPreferDebrid(e.target.checked)}
            />
            <span>Prefer debrid-backed streams</span>
          </label>

          <label className="fieldInline">
            <input
              type="checkbox"
              checked={preferCached}
              onChange={(e) => setPreferCached(e.target.checked)}
            />
            <span>Prefer cached streams</span>
          </label>
        </article>
      </section>

      {/* ── Providers ────────────────────────────────────────────── */}
      <section className="panel" style={{ marginTop: 20 }}>
        <h2>Providers</h2>
        {providers.map((provider, index) => {
          const activePreset = presets.find((x) => x.key === provider.presetKey);
          return (
            <div className="providerCard" key={provider.presetKey + index}>
              <div className="providerHeader">
                <span className="providerBadge">#{index + 1}</span>
                <button className="btnRemove" type="button" onClick={() => removeProvider(index)}>
                  Remove
                </button>
              </div>
              <label className="field">
                <span className="fieldLabel">Service</span>
                <select
                  value={provider.presetKey}
                  onChange={(e) => {
                    const key = e.target.value;
                    const preset = presets.find((x) => x.key === key);
                    updateProvider(index, {
                      presetKey: key,
                      label: preset?.name ?? key,
                      manifestUrl: preset?.urlHint ?? "",
                    });
                  }}
                >
                  {PROVIDER_PRESET_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              {activePreset && (
                <p className="hint">{activePreset.description}</p>
              )}
              <label className="field">
                <span className="fieldLabel">Manifest URL</span>
                <input
                  value={provider.manifestUrl}
                  placeholder={resolveManifestUrl(provider.presetKey)}
                  onChange={(e) => updateProvider(index, { manifestUrl: e.target.value })}
                />
              </label>
              <label className="fieldInline">
                <input
                  type="checkbox"
                  checked={provider.enabled}
                  onChange={(e) => updateProvider(index, { enabled: e.target.checked })}
                />
                <span>Enabled</span>
              </label>
            </div>
          );
        })}
        <div className="ctaRow">
          <button className="button ghost" type="button" onClick={addProvider}>
            + Add provider
          </button>
        </div>
      </section>

      {/* ── Install ──────────────────────────────────────────────── */}
      <section className="panel installPanel" style={{ marginTop: 20 }}>
        <h2>Install</h2>

        {manageUrl && (
          <CopyRow label="Manage URL" url={manageUrl} onCopy={() => copyUrl(manageUrl, "manage")} copied={copied === "manage"} />
        )}
        {installUrl && (
          <CopyRow label="Install page" url={installUrl} onCopy={() => copyUrl(installUrl, "install")} copied={copied === "install"} />
        )}
        {manifestUrl && (
          <CopyRow label="Manifest URL" url={manifestUrl} onCopy={() => copyUrl(manifestUrl, "manifest")} copied={copied === "manifest"} />
        )}

        <div className="ctaRow">
          <button className="button primary" type="button" disabled={bootstrapping} onClick={handleSave}>
            Save profile
          </button>
          <button className="button ghost" type="button" disabled={!manageToken} onClick={handleRotate}>
            Rotate token
          </button>
        </div>
        {status && <p className="statusMsg">{status}</p>}
      </section>
    </main>
  );
}
