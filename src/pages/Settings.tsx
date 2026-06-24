import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Profile {
  id: number;
  name: string;
  mode: string;
  created_at: string;
}

interface SettingsProps {
  isDark: boolean;
  activeProfileId: number;
  onProfileSwitch: (id: number, name: string, mode: string) => void;
}

const MODES = [
  {
    key: "nomad",
    label: "Nomad Mode",
    emoji: "🌍",
    description: "Highlights Expense Tracker, Packing Lists, Country Guide, and Phrasebook.",
  },
  {
    key: "journalist",
    label: "Journalist Mode",
    emoji: "📰",
    description: "Highlights Emergency Toolkit, Metadata Scrubber, Encrypted Journal, and Setup Wizard.",
  },
  {
    key: "traveler",
    label: "Traveler Mode",
    emoji: "✈️",
    description: "Highlights Country Guide, Phrasebook, and Packing Lists.",
  },
  {
    key: "all",
    label: "All Tools",
    emoji: "🛡",
    description: "Shows all features with no filtering. Full access to every tool.",
  },
];

export default function Settings({ isDark, activeProfileId, onProfileSwitch }: SettingsProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // New profile form
  const [newName, setNewName] = useState("");
  const [newMode, setNewMode] = useState("nomad");
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const card = {
    backgroundColor: isDark ? "#162030" : "#ffffff",
    border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
    borderRadius: "12px",
    padding: "20px",
  };

  const input = {
    backgroundColor: isDark ? "#0f1923" : "#f0f4f8",
    border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
    borderRadius: "8px",
    padding: "8px 12px",
    color: isDark ? "#e8edf2" : "#1a2530",
    fontSize: "13px",
    width: "100%",
    outline: "none",
  };

  const btn = (variant: "primary" | "danger" | "ghost") => ({
    padding: "7px 14px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    border: "none",
    backgroundColor:
      variant === "primary" ? "#c9922a"
      : variant === "danger" ? "#7a1a1a"
      : isDark ? "#1d2d3f" : "#e8eef5",
    color:
      variant === "primary" ? "#0f1923"
      : variant === "danger" ? "#f8b4b4"
      : isDark ? "#8fa3b8" : "#4d6278",
  });

  async function loadProfiles() {
    try {
      const result = await invoke<Profile[]>("list_profiles");
      setProfiles(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfiles();
  }, []);

  function flashSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  function flashError(msg: string) {
    setError(msg);
    setTimeout(() => setError(""), 4000);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await invoke("create_profile", { name: newName.trim(), mode: newMode });
      setNewName("");
      setNewMode("nomad");
      await loadProfiles();
      flashSuccess("Profile created.");
    } catch (e) {
      flashError(String(e));
    } finally {
      setCreating(false);
    }
  }

  async function handleModeChange(profileId: number, mode: string) {
    try {
      await invoke("update_profile_mode", { profileId, mode });
      await loadProfiles();
      if (profileId === activeProfileId) {
        const p = profiles.find(p => p.id === profileId);
        if (p) onProfileSwitch(p.id, p.name, mode);
      }
      flashSuccess("Mode updated.");
    } catch (e) {
      flashError(String(e));
    }
  }

  async function handleRename(profileId: number) {
    if (!editName.trim()) return;
    try {
      await invoke("update_profile_name", { profileId, name: editName.trim() });
      await loadProfiles();
      setEditingId(null);
      flashSuccess("Profile renamed.");
    } catch (e) {
      flashError(String(e));
    }
  }

  async function handleDelete(profileId: number) {
    if (profileId === activeProfileId) {
      flashError("Cannot delete the active profile. Switch to another profile first.");
      return;
    }
    try {
      await invoke("delete_profile", { profileId });
      await loadProfiles();
      flashSuccess("Profile deleted.");
    } catch (e) {
      flashError(String(e));
    }
  }

  async function handleSwitch(profile: Profile) {
    onProfileSwitch(profile.id, profile.name, profile.mode);
    flashSuccess(`Switched to ${profile.name}.`);
  }

  if (loading) return (
    <div style={{ color: isDark ? "#8fa3b8" : "#4d6278", fontSize: "13px" }}>Loading profiles…</div>
  );

  return (
    <div style={{ maxWidth: "720px" }}>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "18px", fontWeight: 500 }}>Settings & Profiles</div>
        <div style={{ fontSize: "12px", color: isDark ? "#8fa3b8" : "#4d6278", marginTop: "2px" }}>
          Manage traveler profiles and modes
        </div>
      </div>

      {/* Feedback banners */}
      {error && (
        <div style={{ backgroundColor: "#3a1a1a", border: "0.5px solid #7a1a1a", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px", color: "#f8b4b4" }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ backgroundColor: "#1a3a1a", border: "0.5px solid #1a7a4a", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px", color: "#3ecf8e" }}>
          {success}
        </div>
      )}

      {/* Existing profiles */}
      <div style={{ ...card, marginBottom: "20px" }}>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "#c9922a", marginBottom: "14px" }}>
          Your Profiles
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {profiles.map(profile => (
            <div key={profile.id} style={{
              backgroundColor: isDark ? "#0f1923" : "#f0f4f8",
              border: `0.5px solid ${profile.id === activeProfileId ? "#c9922a" : isDark ? "#243347" : "#ccd8e4"}`,
              borderRadius: "10px",
              padding: "14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <div style={{
                  width: "28px", height: "28px", borderRadius: "50%",
                  backgroundColor: profile.id === activeProfileId ? "#c9922a" : isDark ? "#1d2d3f" : "#e8eef5",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontWeight: 600,
                  color: profile.id === activeProfileId ? "#0f1923" : isDark ? "#8fa3b8" : "#4d6278",
                }}>
                  {profile.name.charAt(0).toUpperCase()}
                </div>

                {editingId === profile.id ? (
                  <div style={{ display: "flex", gap: "8px", flex: 1 }}>
                    <input
                      style={{ ...input, flex: 1 }}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleRename(profile.id)}
                      autoFocus
                    />
                    <button style={btn("primary")} onClick={() => handleRename(profile.id)}>Save</button>
                    <button style={btn("ghost")} onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "13px", fontWeight: 500 }}>{profile.name}</span>
                      {profile.id === activeProfileId && (
                        <span style={{ marginLeft: "8px", fontSize: "10px", color: "#c9922a", fontWeight: 500 }}>ACTIVE</span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {profile.id !== activeProfileId && (
                        <button style={btn("primary")} onClick={() => handleSwitch(profile)}>Switch</button>
                      )}
                      <button style={btn("ghost")} onClick={() => { setEditingId(profile.id); setEditName(profile.name); }}>Rename</button>
                      {profiles.length > 1 && profile.id !== activeProfileId && (
                        <button style={btn("danger")} onClick={() => handleDelete(profile.id)}>Delete</button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Mode selector */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                {MODES.map(mode => (
                  <button
                    key={mode.key}
                    onClick={() => handleModeChange(profile.id, mode.key)}
                    title={mode.description}
                    style={{
                      padding: "6px 8px",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontWeight: 500,
                      cursor: "pointer",
                      border: `0.5px solid ${profile.mode === mode.key ? "#c9922a" : isDark ? "#243347" : "#ccd8e4"}`,
                      backgroundColor: profile.mode === mode.key
                        ? isDark ? "#2a1f0a" : "#fdf3e0"
                        : isDark ? "#162030" : "#ffffff",
                      color: profile.mode === mode.key ? "#c9922a" : isDark ? "#8fa3b8" : "#4d6278",
                      textAlign: "center",
                    }}
                  >
                    {mode.emoji} {mode.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: "11px", color: isDark ? "#4d6278" : "#8fa3b8", marginTop: "6px" }}>
                {MODES.find(m => m.key === profile.mode)?.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create new profile */}
      <div style={card}>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "#c9922a", marginBottom: "14px" }}>
          Create New Profile
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "11px", color: isDark ? "#8fa3b8" : "#4d6278", marginBottom: "4px" }}>Profile name</div>
            <input
              style={input}
              placeholder="e.g. Work Travel, Personal"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
            />
          </div>
          <div style={{ width: "160px" }}>
            <div style={{ fontSize: "11px", color: isDark ? "#8fa3b8" : "#4d6278", marginBottom: "4px" }}>Mode</div>
            <select
              style={{ ...input, width: "160px" }}
              value={newMode}
              onChange={e => setNewMode(e.target.value)}
            >
              {MODES.map(m => (
                <option key={m.key} value={m.key}>{m.emoji} {m.label}</option>
              ))}
            </select>
          </div>
          <button
            style={{ ...btn("primary"), padding: "8px 16px", flexShrink: 0 }}
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
