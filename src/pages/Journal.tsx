import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface JournalEntryMeta {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

interface JournalEntry extends JournalEntryMeta {
  body: string;
}

interface Props {
  isDark: boolean;
}

const PROFILE_NAME = "Marc";

export default function Journal({ isDark }: Props) {
  const [profileId, setProfileId] = useState<number | null>(null);
  const [salt, setSalt] = useState<string>("");
  const [passphrase, setPassphrase] = useState<string>("");
  const [unlocked, setUnlocked] = useState(false);
  const [entries, setEntries] = useState<JournalEntryMeta[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [view, setView] = useState<"list" | "read" | "write">("list");
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const card = {
    backgroundColor: isDark ? "#162030" : "#ffffff",
    border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
    borderRadius: "10px",
    padding: "16px",
  };

  const input = {
    width: "100%",
    backgroundColor: isDark ? "#0f1923" : "#f0f4f8",
    border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
    borderRadius: "6px",
    padding: "8px 10px",
    color: isDark ? "#e8edf2" : "#1a2530",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  // On mount, ensure profile exists and get its salt
  useEffect(() => {
    invoke<[number, string]>("ensure_profile", { name: PROFILE_NAME })
      .then(([id, s]) => {
        setProfileId(id);
        setSalt(s);
      })
      .catch((e) => setError(String(e)));
  }, []);

  async function unlock() {
    if (!passphrase.trim()) return;
    setLoading(true);
    setError("");
    try {
      const list = await invoke<JournalEntryMeta[]>("list_journal_entries", {
        profileId,
      });
      setEntries(list);
      setUnlocked(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function openEntry(id: number) {
    setLoading(true);
    setError("");
    try {
      const entry = await invoke<JournalEntry>("get_journal_entry", {
        entryId: id,
        passphrase,
        salt,
      });
      setSelectedEntry(entry);
      setView("read");
    } catch (e) {
      setError("Could not decrypt entry. Wrong passphrase?");
    } finally {
      setLoading(false);
    }
  }

  async function saveEntry() {
    if (!newTitle.trim() || !newBody.trim()) return;
    setLoading(true);
    setError("");
    try {
      await invoke("create_journal_entry", {
        profileId,
        passphrase,
        salt,
        title: newTitle,
        body: newBody,
      });
      const list = await invoke<JournalEntryMeta[]>("list_journal_entries", {
        profileId,
      });
      setEntries(list);
      setNewTitle("");
      setNewBody("");
      setView("list");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function deleteEntry(id: number) {
    try {
      await invoke("delete_journal_entry", { entryId: id });
      setEntries((prev) => prev.filter((e) => e.id !== id));
      if (selectedEntry?.id === id) {
        setSelectedEntry(null);
        setView("list");
      }
    } catch (e) {
      setError(String(e));
    }
  }

  // Lock screen
  if (!unlocked) {
    return (
      <div style={{ maxWidth: "360px", margin: "60px auto" }}>
        <div style={card}>
          <div style={{ fontSize: "16px", fontWeight: 500, marginBottom: "4px" }}>
            🔐 Encrypted Journal
          </div>
          <div style={{ fontSize: "12px", color: isDark ? "#8fa3b8" : "#4d6278", marginBottom: "16px" }}>
            Enter your passphrase to unlock
          </div>
          <input
            type="password"
            placeholder="Passphrase"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && unlock()}
            style={input}
          />
          {error && (
            <div style={{ fontSize: "12px", color: "#e05c5c", marginTop: "8px" }}>{error}</div>
          )}
          <button
            onClick={unlock}
            disabled={loading}
            style={{
              marginTop: "12px", width: "100%",
              backgroundColor: "#c9922a", color: "#0f1923",
              border: "none", borderRadius: "6px",
              padding: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer",
            }}
          >
            {loading ? "Unlocking..." : "Unlock Journal"}
          </button>
        </div>
      </div>
    );
  }

  // Write view
  if (view === "write") {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <button onClick={() => setView("list")} style={{ background: "none", border: "none", color: "#c9922a", cursor: "pointer", fontSize: "13px" }}>
            ← Back
          </button>
          <div style={{ fontSize: "16px", fontWeight: 500 }}>New Entry</div>
        </div>
        <div style={card}>
          <input
            placeholder="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{ ...input, marginBottom: "10px", fontSize: "15px", fontWeight: 500 }}
          />
          <textarea
            placeholder="Write your entry..."
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            rows={14}
            style={{ ...input, resize: "vertical", lineHeight: 1.6 }}
          />
          {error && <div style={{ fontSize: "12px", color: "#e05c5c", marginTop: "8px" }}>{error}</div>}
          <button
            onClick={saveEntry}
            disabled={loading}
            style={{
              marginTop: "12px",
              backgroundColor: "#c9922a", color: "#0f1923",
              border: "none", borderRadius: "6px",
              padding: "8px 16px", fontSize: "13px", fontWeight: 500, cursor: "pointer",
            }}
          >
            {loading ? "Saving..." : "Save Entry"}
          </button>
        </div>
      </div>
    );
  }

  // Read view
  if (view === "read" && selectedEntry) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={() => setView("list")} style={{ background: "none", border: "none", color: "#c9922a", cursor: "pointer", fontSize: "13px" }}>
              ← Back
            </button>
            <div style={{ fontSize: "16px", fontWeight: 500 }}>{selectedEntry.title}</div>
          </div>
          <button
            onClick={() => deleteEntry(selectedEntry.id)}
            style={{ background: "none", border: "none", color: "#e05c5c", cursor: "pointer", fontSize: "12px" }}
          >
            Delete
          </button>
        </div>
        <div style={card}>
          <div style={{ fontSize: "11px", color: isDark ? "#4d6278" : "#8fa3b8", marginBottom: "14px" }}>
            {selectedEntry.created_at}
          </div>
          <div style={{ fontSize: "14px", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {selectedEntry.body}
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <div style={{ fontSize: "18px", fontWeight: 500 }}>Journal</div>
          <div style={{ fontSize: "12px", color: isDark ? "#8fa3b8" : "#4d6278", marginTop: "2px" }}>
            {entries.length} encrypted {entries.length === 1 ? "entry" : "entries"}
          </div>
        </div>
        <button
          onClick={() => setView("write")}
          style={{
            backgroundColor: "#c9922a", color: "#0f1923",
            border: "none", borderRadius: "8px",
            padding: "7px 14px", fontSize: "13px", fontWeight: 500, cursor: "pointer",
          }}
        >
          + New entry
        </button>
      </div>

      {entries.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "40px", color: isDark ? "#4d6278" : "#8fa3b8" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>📓</div>
          <div style={{ fontSize: "13px" }}>No entries yet. Write your first one.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {entries.map((e) => (
            <div
              key={e.id}
              onClick={() => openEntry(e.id)}
              style={{
                ...card,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderLeft: "2px solid #c9922a",
              }}
            >
              <div>
                <div style={{ fontSize: "13px", fontWeight: 500 }}>{e.title}</div>
                <div style={{ fontSize: "11px", color: isDark ? "#4d6278" : "#8fa3b8", marginTop: "3px" }}>
                  {e.created_at}
                </div>
              </div>
              <span style={{ fontSize: "11px", color: "#c9922a" }}>🔒</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}