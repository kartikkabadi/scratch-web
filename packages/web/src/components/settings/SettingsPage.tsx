import { useCallback, useState } from "react";
import type { GitStatus, Settings } from "@scratch-web/shared";
import { useAppActions, useAppData } from "../../context/AppContext";
import {
  commitGit,
  fetchGit,
  getGitAvailability,
  getGitStatus,
  initGit,
  pullGit,
  pushGit,
  pushGitUpstream,
  setGitRemote,
  syncGit,
} from "../../services/api";
import { ArrowLeftIcon, FolderIcon, InfoIcon, KeyboardIcon, SettingsIcon, SwatchIcon, XIcon } from "../ui/icons";

type SettingsTab = "general" | "integrations" | "appearance" | "shortcuts" | "about";

const tabs: { id: SettingsTab; label: string; icon: typeof FolderIcon; shortcut: string }[] = [
  { id: "general", label: "Folder", icon: FolderIcon, shortcut: "1" },
  { id: "integrations", label: "Integrations", icon: SettingsIcon, shortcut: "2" },
  { id: "appearance", label: "Appearance", icon: SwatchIcon, shortcut: "3" },
  { id: "shortcuts", label: "Shortcuts", icon: KeyboardIcon, shortcut: "4" },
  { id: "about", label: "About", icon: InfoIcon, shortcut: "5" },
];

const colorKeys = ["bg", "bg-secondary", "bg-muted", "bg-emphasis", "text", "text-muted", "accent", "border", "selection"] as const;

const shortcuts = [
  ["Cmd/Ctrl+K", "Command palette"],
  ["Cmd/Ctrl+N", "New note"],
  ["Cmd/Ctrl+B", "Bold"],
  ["Cmd/Ctrl+I", "Italic"],
  ["Cmd/Ctrl+F", "Find in note"],
  ["Cmd/Ctrl+Shift+F", "Focus mode"],
  ["Cmd/Ctrl+Shift+M", "Markdown source mode"],
  ["Cmd/Ctrl+,", "Settings"],
  ["/", "Slash commands"],
  ["[[", "Wikilink autocomplete"],
  ["Esc", "Close search, palette, or dialog"],
];

function defaultSettings(settings: Settings | null): Settings {
  return settings ?? { theme: { mode: "system" } };
}

function previewTemplate(template: string): string {
  const now = new Date("2026-04-27T12:00:00");
  return (template || "Untitled")
    .replace(/\{date\}/gu, now.toISOString().slice(0, 10))
    .replace(/\{time\}/gu, "12-00")
    .replace(/\{datetime\}/gu, "2026-04-27 12-00");
}

export function SettingsPage() {
  const { settings, notesFolder } = useAppData();
  const { setView, updateSettings, setError } = useAppActions();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  const handleChange = useCallback(
    (partial: Partial<Settings>) => {
      updateSettings({ ...defaultSettings(settings), ...partial });
    },
    [settings, updateSettings],
  );

  return (
    <div className="settings-shell" style={{ display: "flex", width: "100%", height: "100%" }}>
      <aside className="settings-nav" style={navStyle}>
        <div style={navHeaderStyle}>
          <button onClick={() => setView("notes")} title="Back to notes" style={iconButtonStyle}>
            <ArrowLeftIcon style={{ width: 18, height: 18 }} />
          </button>
          <span style={{ fontWeight: 600, fontSize: "1rem", color: "var(--color-text)" }}>Settings</span>
        </div>
        <nav style={{ padding: 8, display: "flex", flexDirection: "column", gap: 2 }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={tabStyle(isActive)}>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon style={{ width: 16, height: 16 }} />
                  {tab.label}
                </span>
                <kbd style={miniKbdStyle}>⌘{tab.shortcut}</kbd>
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="settings-content" style={{ flex: 1, overflow: "auto", padding: "24px 20px 60px" }}>
        <div style={{ maxWidth: "44rem", margin: "0 auto" }}>
          {activeTab === "general" && <GeneralSettings notesFolder={notesFolder} settings={settings} onChange={handleChange} />}
          {activeTab === "integrations" && <IntegrationsSettings settings={settings} onChange={handleChange} setError={setError} />}
          {activeTab === "appearance" && <AppearanceSettings settings={settings} onChange={handleChange} />}
          {activeTab === "shortcuts" && <ShortcutsSettings />}
          {activeTab === "about" && <AboutSettings />}
        </div>
      </main>
    </div>
  );
}

function GeneralSettings({ notesFolder, settings, onChange }: { notesFolder: string | null; settings: Settings | null; onChange: (partial: Partial<Settings>) => void }) {
  const [ignoredDraft, setIgnoredDraft] = useState("");
  const ignored = settings?.ignoredPatterns ?? [];
  const template = settings?.defaultNoteName ?? "Untitled";

  return (
    <div style={stackStyle}>
      <Section title="Folder location">
        <Panel>
          <Muted>Scratch Web reads and writes the Scratch notes folder configured on this Mac. Browser clients cannot directly choose or open arbitrary Mac folders; use the local setup CLI to change it.</Muted>
          <CodeLine>{notesFolder || "Not configured"}</CodeLine>
        </Panel>
      </Section>

      <Section title="Notes">
        <SettingRow label="Enable folders"><Toggle checked={settings?.foldersEnabled ?? false} onChange={(foldersEnabled) => onChange({ foldersEnabled })} /></SettingRow>
        <SettingRow label="Save mode" help="Auto save is the default. Manual mode shows an explicit Save button in the editor.">
          <Segmented value={settings?.saveMode ?? "auto"} values={["auto", "manual"]} onChange={(saveMode) => onChange({ saveMode: saveMode as "auto" | "manual" })} />
        </SettingRow>
        <SettingRow label="Default note name" help={`Preview: ${previewTemplate(template)}`}>
          <Input value={template} onChange={(value) => onChange({ defaultNoteName: value })} />
        </SettingRow>
        <Muted>Template tokens: {"{date}"}, {"{time}"}, {"{datetime}"}.</Muted>
      </Section>

      <Section title="Ignored folders">
        <Panel>
          <Muted>Ignored names are hidden from note lists and search. Keep generated folders such as build outputs out of Scratch Web.</Muted>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Input value={ignoredDraft} placeholder="folder-name" onChange={setIgnoredDraft} />
            <Button onClick={() => {
              const next = ignoredDraft.trim();
              if (!next || ignored.includes(next)) return;
              onChange({ ignoredPatterns: [...ignored, next] });
              setIgnoredDraft("");
            }}>Add</Button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {ignored.length === 0 ? <Muted>No custom ignored folders.</Muted> : ignored.map((pattern) => (
              <button key={pattern} onClick={() => onChange({ ignoredPatterns: ignored.filter((item) => item !== pattern) })} style={chipStyle}>
                {pattern}
                <XIcon style={{ width: 13, height: 13 }} />
              </button>
            ))}
          </div>
        </Panel>
      </Section>
    </div>
  );
}

function IntegrationsSettings({ settings, onChange, setError }: { settings: Settings | null; onChange: (partial: Partial<Settings>) => void; setError: (error: string | null) => void }) {
  const [gitStatus, setGitStatusState] = useState<GitStatus | null>(null);
  const [gitInfo, setGitInfo] = useState<string>("Not checked");
  const [busy, setBusy] = useState<string | null>(null);

  const refreshGit = useCallback(async () => {
    setBusy("Checking Git");
    try {
      const [availability, status] = await Promise.all([getGitAvailability(), getGitStatus()]);
      setGitStatusState(status);
      setGitInfo(availability.available ? availability.version ?? "Git available" : "Git is not installed or not on PATH");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to read Git status");
    } finally {
      setBusy(null);
    }
  }, [setError]);

  const runGit = useCallback(async (label: string, confirmText: string, action: () => Promise<{ status: GitStatus }>) => {
    if (!window.confirm(confirmText)) return;
    setBusy(label);
    try {
      const result = await action();
      setGitStatusState(result.status);
      setError(`${label} complete`);
    } catch (error) {
      setError(error instanceof Error ? error.message : `${label} failed`);
    } finally {
      setBusy(null);
    }
  }, [setError]);

  return (
    <div style={stackStyle}>
      <Section title="Access">
        <Panel>
          <div style={panelTitleStyle}>Passcode / auth</div>
          <Muted>Optional app auth is configured by the local setup CLI. Tailscale keeps Scratch Web private to your Tailnet; enable a passcode if the Tailnet or devices are shared.</Muted>
        </Panel>
      </Section>

      <Section title="Version control">
        <Panel>
          <SettingRow label="Enable Git controls"><Toggle checked={settings?.gitEnabled ?? false} onChange={(gitEnabled) => onChange({ gitEnabled })} /></SettingRow>
          <Muted>Git operations run in your notes folder and always ask before writes or network actions.</Muted>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <Button onClick={refreshGit}>Refresh</Button>
            <Button onClick={() => runGit("Git init", "Initialize a Git repository in your notes folder?", initGit)}>Init</Button>
            <Button onClick={() => {
              const message = window.prompt("Commit message");
              if (!message?.trim()) return;
              runGit("Git commit", `Commit all note changes with message "${message.trim()}"?`, () => commitGit(message.trim()));
            }}>Commit</Button>
            <Button onClick={() => runGit("Git fetch", "Fetch from the configured Git remote?", fetchGit)}>Fetch</Button>
            <Button onClick={() => runGit("Git pull", "Pull note changes with --ff-only?", pullGit)}>Pull</Button>
            <Button onClick={() => runGit("Git push", "Push commits to the configured Git remote?", pushGit)}>Push</Button>
            <Button onClick={() => runGit("Git sync", "Fetch, fast-forward pull, and push?", syncGit)}>Sync</Button>
            <Button onClick={() => {
              const url = window.prompt("Git remote URL");
              if (!url?.trim()) return;
              runGit("Set remote", "Set the origin remote for this notes folder?", () => setGitRemote(url.trim()));
            }}>Set remote</Button>
            <Button onClick={() => runGit("Push upstream", "Push the current branch and set upstream?", pushGitUpstream)}>Push upstream</Button>
          </div>
          <div style={{ marginTop: 14 }}>
            <StatusLine label="Git" value={busy ?? gitInfo} />
            <StatusLine label="Repository" value={gitStatus ? (gitStatus.initialized ? "Initialized" : "Not initialized") : "Unknown"} />
            <StatusLine label="Branch" value={gitStatus?.branch ?? "None"} />
            <StatusLine label="Upstream" value={gitStatus?.upstream ?? "None"} />
            <StatusLine label="Changes" value={gitStatus ? (gitStatus.clean ? "Clean" : `${gitStatus.entries?.length ?? 0} changed`) : "Unknown"} />
            <StatusLine label="Ahead / behind" value={`${gitStatus?.ahead ?? 0} / ${gitStatus?.behind ?? 0}`} />
          </div>
        </Panel>
      </Section>
    </div>
  );
}

function AppearanceSettings({ settings, onChange }: { settings: Settings | null; onChange: (partial: Partial<Settings>) => void }) {
  const font = settings?.editorFont ?? {};
  const colors = settings?.theme.mode === "dark" ? settings?.customColorsDark ?? {} : settings?.customColorsLight ?? {};
  const setFont = (partial: NonNullable<Settings["editorFont"]>) => onChange({ editorFont: { ...font, ...partial } });
  const setColor = (key: string, value: string) => {
    const target = settings?.theme.mode === "dark" ? "customColorsDark" : "customColorsLight";
    onChange({ [target]: { ...(settings?.[target] as Record<string, string> | undefined), [key]: value } });
  };

  return (
    <div style={stackStyle}>
      <Section title="Theme">
        <Segmented value={settings?.theme.mode ?? "system"} values={["light", "dark", "system"]} onChange={(mode) => onChange({ theme: { mode: mode as "light" | "dark" | "system" } })} />
      </Section>
      <Section title="Typography">
        <SettingRow label="Font"><Select value={font.baseFontFamily ?? "system-sans"} values={["system-sans", "serif", "monospace"]} onChange={(baseFontFamily) => setFont({ baseFontFamily: baseFontFamily as "system-sans" | "serif" | "monospace" })} /></SettingRow>
        <SettingRow label="Size"><NumberInput value={font.baseFontSize ?? 16} min={8} max={48} onChange={(baseFontSize) => setFont({ baseFontSize })} /></SettingRow>
        <SettingRow label="Bold weight"><NumberInput value={font.boldWeight ?? 700} min={100} max={1000} step={100} onChange={(boldWeight) => setFont({ boldWeight })} /></SettingRow>
        <SettingRow label="Line height"><NumberInput value={font.lineHeight ?? 1.6} min={1} max={3} step={0.1} onChange={(lineHeight) => setFont({ lineHeight })} /></SettingRow>
        <SettingRow label="Text direction"><Segmented value={settings?.textDirection ?? "auto"} values={["auto", "ltr", "rtl"]} onChange={(textDirection) => onChange({ textDirection: textDirection as "auto" | "ltr" | "rtl" })} /></SettingRow>
      </Section>
      <Section title="Page width and zoom">
        <SettingRow label="Editor width"><Select value={settings?.editorWidth ?? "normal"} values={["narrow", "normal", "wide", "full", "custom"]} onChange={(editorWidth) => onChange({ editorWidth: editorWidth as Settings["editorWidth"] })} /></SettingRow>
        {settings?.editorWidth === "custom" && <SettingRow label="Custom width"><NumberInput value={settings.customEditorWidthPx ?? 720} min={240} max={2400} onChange={(customEditorWidthPx) => onChange({ customEditorWidthPx })} /></SettingRow>}
        <SettingRow label="Interface zoom"><NumberInput value={settings?.interfaceZoom ?? 100} min={50} max={200} onChange={(interfaceZoom) => onChange({ interfaceZoom })} /></SettingRow>
      </Section>
      <Section title="Custom colors">
        <Panel>
          <Muted>Colors apply to the current theme mode. System mode stores light colors here; switch to dark to edit dark colors.</Muted>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 12 }}>
            {colorKeys.map((key) => (
              <label key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: "0.8125rem" }}>
                <span>{key}</span>
                <input type="color" value={normalizeColor(colors[key])} onChange={(event) => setColor(key, event.target.value)} />
              </label>
            ))}
          </div>
        </Panel>
      </Section>
    </div>
  );
}

function ShortcutsSettings() {
  return <Section title="Keyboard shortcuts"><Panel>{shortcuts.map(([key, action]) => <StatusLine key={key} label={action} value={key} />)}</Panel></Section>;
}

function AboutSettings() {
  return (
    <div style={stackStyle}>
      <Section title="About Scratch Web">
        <Panel>
          <p style={paragraphStyle}>Scratch Web is an experimental, independent, unofficial web companion for <a href="https://github.com/erictli/scratch" target="_blank" rel="noopener noreferrer">Scratch</a> by erictli.</p>
          <p style={paragraphStyle}>Scratch Web would not be possible without Scratch. It keeps the Mac-hosted, local Markdown model and adapts it for phones over Tailscale.</p>
        </Panel>
      </Section>
      <Section title="Native-specific behavior">
        <Panel>
          <Muted>Native Scratch can preview/open arbitrary local files through the desktop app. Scratch Web does not expose arbitrary Mac file access in the browser. Image insertion uses the safe asset import route only.</Muted>
        </Panel>
      </Section>
    </div>
  );
}

function normalizeColor(value: string | undefined): string {
  return /^#[0-9a-f]{6}$/iu.test(value ?? "") ? value! : "#78716c";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 style={sectionTitleStyle}>{title}</h2>{children}</section>;
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div style={panelStyle}>{children}</div>;
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p style={mutedStyle}>{children}</p>;
}

function CodeLine({ children }: { children: React.ReactNode }) {
  return <div style={codeLineStyle}>{children}</div>;
}

function SettingRow({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div style={rowStyle}>
      <div>
        <div style={{ fontSize: "0.875rem", color: "var(--color-text)", fontWeight: 500 }}>{label}</div>
        {help && <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 3 }}>{help}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return <div style={statusLineStyle}><span>{label}</span><span style={{ color: "var(--color-text)", fontFamily: "monospace" }}>{value}</span></div>;
}

function Button({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} style={buttonStyle}>{children}</button>;
}

function Input({ value, placeholder, onChange }: { value: string; placeholder?: string; onChange: (value: string) => void }) {
  return <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} style={inputStyle} />;
}

function NumberInput({ value, min, max, step = 1, onChange }: { value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  return <input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} style={{ ...inputStyle, width: 88 }} />;
}

function Select({ value, values, onChange }: { value: string; values: string[]; onChange: (value: string) => void }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} style={inputStyle}>{values.map((item) => <option key={item} value={item}>{item}</option>)}</select>;
}

function Segmented({ value, values, onChange }: { value: string; values: string[]; onChange: (value: string) => void }) {
  return <div style={segmentedStyle}>{values.map((item) => <button key={item} type="button" onClick={() => onChange(item)} style={segmentStyle(value === item)}>{item}</button>)}</div>;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return <button type="button" onClick={() => onChange(!checked)} style={toggleStyle(checked)}><span style={toggleKnobStyle(checked)} /></button>;
}

const stackStyle = { display: "flex", flexDirection: "column", gap: 24 } as const;
const navStyle = { width: 240, height: "100%", backgroundColor: "var(--color-bg-secondary)", borderRight: "1px solid var(--color-border)", display: "flex", flexDirection: "column", flexShrink: 0 } as const;
const navHeaderStyle = { display: "flex", alignItems: "center", gap: 8, padding: 12, borderBottom: "1px solid var(--color-border)" } as const;
const iconButtonStyle = { background: "none", border: "none", color: "var(--color-text)", cursor: "pointer", padding: 4, borderRadius: 6 } as const;
const miniKbdStyle = { fontFamily: "monospace", fontSize: "0.6875rem", color: "var(--color-text-muted)" } as const;
const sectionTitleStyle = { fontSize: "1.125rem", fontWeight: 600, marginBottom: 12, color: "var(--color-text)" } as const;
const panelStyle = { padding: 12, borderRadius: 8, border: "1px solid var(--color-border)", backgroundColor: "var(--color-bg-secondary)" } as const;
const panelTitleStyle = { fontSize: "0.875rem", color: "var(--color-text)", fontWeight: 500, marginBottom: 4 } as const;
const mutedStyle = { fontSize: "0.8125rem", color: "var(--color-text-muted)", lineHeight: 1.5, margin: 0 } as const;
const paragraphStyle = { fontSize: "0.875rem", color: "var(--color-text-muted)", lineHeight: 1.6, margin: "0 0 10px" } as const;
const codeLineStyle = { marginTop: 10, fontSize: "0.8125rem", color: "var(--color-text)", fontFamily: "monospace", wordBreak: "break-all" } as const;
const rowStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: "1px solid var(--color-border)" } as const;
const statusLineStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "6px 0", fontSize: "0.8125rem", color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" } as const;
const inputStyle = { padding: "5px 8px", borderRadius: 6, border: "1px solid var(--color-border)", backgroundColor: "var(--color-bg)", color: "var(--color-text)", fontSize: "0.8125rem" } as const;
const buttonStyle = { background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 6, color: "var(--color-text)", cursor: "pointer", fontSize: "0.8125rem", padding: "6px 10px" } as const;
const chipStyle = { display: "inline-flex", alignItems: "center", gap: 6, background: "var(--color-bg-muted)", border: "1px solid var(--color-border)", borderRadius: 6, color: "var(--color-text)", cursor: "pointer", fontSize: "0.8125rem", padding: "5px 8px" } as const;
const segmentedStyle = { display: "flex", gap: 4, padding: 3, borderRadius: 8, backgroundColor: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" } as const;
const tabStyle = (active: boolean) => ({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 10px", borderRadius: 6, border: "none", backgroundColor: active ? "var(--color-bg-muted)" : "transparent", color: active ? "var(--color-text)" : "var(--color-text-muted)", fontSize: "0.875rem", fontWeight: active ? 500 : 400, cursor: "pointer", textAlign: "left" as const });
const segmentStyle = (active: boolean) => ({ border: "none", borderRadius: 6, backgroundColor: active ? "var(--color-bg)" : "transparent", color: active ? "var(--color-text)" : "var(--color-text-muted)", cursor: "pointer", fontSize: "0.8125rem", padding: "5px 10px", textTransform: "capitalize" as const });
const toggleStyle = (checked: boolean) => ({ width: 40, height: 24, borderRadius: 12, border: "none", backgroundColor: checked ? "var(--color-accent)" : "var(--color-bg-muted)", position: "relative" as const, cursor: "pointer", padding: 0 });
const toggleKnobStyle = (checked: boolean) => ({ width: 20, height: 20, borderRadius: "50%", backgroundColor: "var(--color-bg)", position: "absolute" as const, top: 2, left: checked ? 18 : 2, transition: "left 0.15s" });
