import { useEffect, useState } from 'react';
import { api, ApiError, SettingsInfo } from '../api.js';

function ago(iso: string | null): string {
  if (!iso) return 'never';
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`;
  return `${Math.round(secs / 3600)}h ago`;
}

/** Admin settings: the Vestaboard key that turns cloud push on, plus data keys. */
export function SettingsPanel() {
  const [info, setInfo] = useState<SettingsInfo | null>(null);
  const [key, setKey] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [authHeader, setAuthHeader] = useState('');
  const [coingeckoKey, setCoingeckoKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [localHost, setLocalHost] = useState('');
  const [localKey, setLocalKey] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api
      .getSettings()
      .then((s) => {
        setInfo(s);
        setApiUrl(s.vestaboard.apiUrl ?? '');
        setAuthHeader(s.vestaboard.authHeader ?? '');
        setLocalHost(s.local.host ?? '');
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)));

  useEffect(() => {
    load();
    // Poll so "pushing" status flips on shortly after the key is saved.
    const id = setInterval(() => {
      api.getSettings().then(setInfo).catch(() => {});
    }, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    setNote(null);
    try {
      await api.putSettings({
        ...(key.trim() ? { vestaboardKey: key.trim() } : {}),
        vestaboardApiUrl: apiUrl.trim() || null,
        vestaboardAuthHeader: authHeader.trim() || null,
        localBoardHost: localHost.trim() || null,
        ...(localKey.trim() ? { vestaboardLocalKey: localKey.trim() } : {}),
        ...(coingeckoKey.trim() ? { coingeckoApiKey: coingeckoKey.trim() } : {}),
        ...(anthropicKey.trim() ? { anthropicApiKey: anthropicKey.trim() } : {}),
      });
      setKey('');
      setLocalKey('');
      setCoingeckoKey('');
      setAnthropicKey('');
      setNote('Saved.');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const clearKey = async () => {
    setError(null);
    setNote(null);
    try {
      await api.putSettings({ vestaboardKey: null });
      setKey('');
      await load();
      setNote('Vestaboard key removed — the board will stop updating.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  };

  if (!info) return <p className="hint">Loading settings…</p>;

  const push = info.push;
  const anyKey = info.vestaboard.keySet || (info.local.keySet && Boolean(info.local.host));
  const status = !anyKey
    ? { text: 'Not pushing — no key set', cls: 'status-off' }
    : push?.pushEnabled
      ? push.via === 'local'
        ? { text: 'Pushing locally — transitions active', cls: 'status-on' }
        : { text: 'Pushing to the board (cloud)', cls: 'status-on' }
      : { text: 'Key set — starting…', cls: 'status-pending' };

  return (
    <div className="settings">
      <div className={`status-pill ${status.cls}`}>{status.text}</div>
      {anyKey && push && (
        <p className="hint">
          Last pushed: {push.lastPushedSlide ? `“${push.lastPushedSlide}” · ${ago(push.lastPushAt)}` : '—'}
          {push.lastPushedSlide && push.via ? ` · via ${push.via}` : ''}
          {push.lastError ? ` · ${push.lastError}` : ''}
        </p>
      )}
      {error && <p className="error">{error}</p>}
      {note && <p className="hint">{note}</p>}

      <label className="field">
        <span>Vestaboard Read-Write key</span>
        <input
          type="password"
          autoComplete="off"
          placeholder={info.vestaboard.keySet ? '•••••••• (set — type to replace)' : 'paste your key'}
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
      </label>
      <p className="hint">
        Enable the Read-Write API in the API tab at web.vestaboard.com and paste the token
        here. Saving it starts cloud push within a few seconds — no redeploy.
      </p>

      <h3 className="settings-subhead">Local board (via Tailscale)</h3>
      <label className="field">
        <span>Board LAN IP / host</span>
        <input
          autoComplete="off"
          placeholder="e.g. 192.168.1.40"
          value={localHost}
          onChange={(e) => setLocalHost(e.target.value)}
        />
      </label>
      <label className="field">
        <span>Local API key</span>
        <input
          type="password"
          autoComplete="off"
          placeholder={info.local.keySet ? '•••••••• (set — type to replace)' : 'from Local API enablement'}
          value={localKey}
          onChange={(e) => setLocalKey(e.target.value)}
        />
      </label>
      <p className="hint">
        With the VPS on your tailnet (NAS as subnet router), the server pushes straight
        to the board's Local API — that's what makes per-slide transitions work. If the
        tunnel drops, pushes fall back to the cloud key automatically. Setup steps:
        docs/local-push.md in the repo.
      </p>

      <div className="settings-actions">
        <button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {info.vestaboard.keySet && (
          <button onClick={clearKey} disabled={saving}>
            Remove key
          </button>
        )}
        <button className="link-button" onClick={() => setAdvanced((v) => !v)}>
          {advanced ? 'Hide advanced' : 'Advanced'}
        </button>
      </div>

      {advanced && (
        <div className="settings-advanced">
          <label className="field">
            <span>API endpoint (blank = cloud.vestaboard.com)</span>
            <input
              placeholder="https://cloud.vestaboard.com/"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Auth header (blank = X-Vestaboard-Token)</span>
            <input
              placeholder="X-Vestaboard-Token"
              value={authHeader}
              onChange={(e) => setAuthHeader(e.target.value)}
            />
          </label>
          <p className="hint">
            Only change these if your account uses the older
            rw.vestaboard.com / X-Vestaboard-Read-Write-Key pairing.
          </p>
          <label className="field">
            <span>CoinGecko API key (optional)</span>
            <input
              type="password"
              autoComplete="off"
              placeholder={info.coingecko.keySet ? '•••••••• (set)' : 'optional — raises rate limit'}
              value={coingeckoKey}
              onChange={(e) => setCoingeckoKey(e.target.value)}
            />
          </label>
          <p className="hint">
            Crypto quotes use CoinGecko's free API with no key. A demo key just raises the
            rate limit. (Changing it applies on the next server restart.)
          </p>
          <label className="field">
            <span>Anthropic API key (news digest)</span>
            <input
              type="password"
              autoComplete="off"
              placeholder={info.anthropic.keySet ? '•••••••• (set)' : 'sk-ant-… enables the AI news digest'}
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
            />
          </label>
          <p className="hint">
            Powers the “digest” news mode — headlines distilled into board-sized lines,
            refreshed every 2 hours (~pennies/day). Without it, news shows raw headlines.
          </p>
        </div>
      )}
    </div>
  );
}
