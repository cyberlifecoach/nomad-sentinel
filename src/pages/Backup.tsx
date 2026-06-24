import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

interface BackupProps {
  isDark: boolean;
}

export default function Backup({ isDark }: BackupProps) {
  // Export state
  const [passphrase, setPassphrase] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportedPath, setExportedPath] = useState("");
  const [exportError, setExportError] = useState("");
  const [showExportPass, setShowExportPass] = useState(false);

  // Restore state
  const [restoreFile, setRestoreFile] = useState("");
  const [restorePass, setRestorePass] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState("");
  const [restoreError, setRestoreError] = useState("");
  const [showRestorePass, setShowRestorePass] = useState(false);
  const [restoreConfirmed, setRestoreConfirmed] = useState(false);

  const card = {
    backgroundColor: isDark ? "#162030" : "#ffffff",
    border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "16px",
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

  function flashExportError(msg: string) {
    setExportError(msg);
    setTimeout(() => setExportError(""), 5000);
  }

  function flashRestoreError(msg: string) {
    setRestoreError(msg);
    setTimeout(() => setRestoreError(""), 5000);
  }

  async function handleExport() {
    if (!passphrase) { flashExportError("Please enter a passphrase to encrypt your backup."); return; }
    if (passphrase !== confirmPass) { flashExportError("Passphrases do not match."); return; }
    if (passphrase.length < 8) { flashExportError("Passphrase must be at least 8 characters."); return; }

    setExporting(true);
    setExportError("");
    setExportedPath("");

    try {
      const path = await invoke<string>("export_backup", { passphrase });
      setExportedPath(path);
      setPassphrase("");
      setConfirmPass("");
    } catch (e) {
      flashExportError(String(e));
    } finally {
      setExporting(false);
    }
  }

  async function handleBrowse() {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Nomad Sentinel Backup", extensions: ["nsb"] }],
      });
      if (selected && typeof selected === "string") {
        setRestoreFile(selected);
        setRestoreConfirmed(false);
        setRestoreSuccess("");
        setRestoreError("");
      }
    } catch (e) {
      flashRestoreError(String(e));
    }
  }

  async function handleRestore() {
    if (!restoreFile) { flashRestoreError("Please select a backup file."); return; }
    if (!restorePass) { flashRestoreError("Please enter the backup passphrase."); return; }
    if (!restoreConfirmed) { flashRestoreError("Please confirm you understand this will replace all current data."); return; }

    setRestoring(true);
    setRestoreError("");
    setRestoreSuccess("");

    try {
      const result = await invoke<string>("import_backup", {
        filePath: restoreFile,
        passphrase: restorePass,
      });
      setRestoreSuccess(result);
      setRestoreFile("");
      setRestorePass("");
      setRestoreConfirmed(false);
    } catch (e) {
      flashRestoreError(String(e));
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div style={{ maxWidth: "640px" }}>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "18px", fontWeight: 500 }}>Export & Backup</div>
        <div style={{ fontSize: "12px", color: isDark ? "#8fa3b8" : "#4d6278", marginTop: "2px" }}>
          Create or restore an encrypted backup of all your data
        </div>
      </div>

      {/* What's included */}
      <div style={card}>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "#c9922a", marginBottom: "12px" }}>
          📦 What's included in the backup
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {[
            "📓 All journal entries (encrypted)",
            "🚨 Emergency contacts (encrypted)",
            "✅ Packing checklists",
            "💰 Expense records",
            "🚪 Exit checklist items",
            "👤 Profile settings",
          ].map((item, i) => (
            <div key={i} style={{ fontSize: "12px", color: isDark ? "#8fa3b8" : "#4d6278" }}>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Export section */}
      <div style={card}>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "#c9922a", marginBottom: "14px" }}>
          🔐 Export Encrypted Backup
        </div>

        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "11px", color: isDark ? "#8fa3b8" : "#4d6278", marginBottom: "4px" }}>Backup passphrase</div>
          <div style={{ position: "relative" }}>
            <input
              style={{ ...input, paddingRight: "40px" }}
              type={showExportPass ? "text" : "password"}
              placeholder="Enter a strong passphrase"
              value={passphrase}
              onChange={e => setPassphrase(e.target.value)}
            />
            <button onClick={() => setShowExportPass(!showExportPass)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: isDark ? "#8fa3b8" : "#4d6278", fontSize: "13px" }}>
              {showExportPass ? "🙈" : "👁"}
            </button>
          </div>
          <div style={{ fontSize: "11px", color: isDark ? "#4d6278" : "#8fa3b8", marginTop: "4px" }}>
            This passphrase encrypts your backup. Store it safely — it cannot be recovered.
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", color: isDark ? "#8fa3b8" : "#4d6278", marginBottom: "4px" }}>Confirm passphrase</div>
          <input
            style={input}
            type={showExportPass ? "text" : "password"}
            placeholder="Re-enter passphrase"
            value={confirmPass}
            onChange={e => setConfirmPass(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleExport()}
          />
        </div>

        {exportError && (
          <div style={{ backgroundColor: "#3a1a1a", border: "0.5px solid #7a1a1a", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", fontSize: "13px", color: "#f8b4b4" }}>
            {exportError}
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={exporting || !passphrase || !confirmPass}
          style={{ backgroundColor: exporting ? "#7a541a" : "#c9922a", color: "#0f1923", border: "none", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 500, cursor: exporting ? "not-allowed" : "pointer", opacity: !passphrase || !confirmPass ? 0.5 : 1 }}
        >
          {exporting ? "Exporting…" : "Export Encrypted Backup"}
        </button>

        {exportedPath && (
          <div style={{ backgroundColor: isDark ? "#0f2318" : "#d4f5e3", border: "0.5px solid #1a7a4a", borderRadius: "10px", padding: "14px", marginTop: "14px" }}>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "#3ecf8e", marginBottom: "6px" }}>✅ Backup exported successfully</div>
            <div style={{ fontSize: "11px", color: isDark ? "#8fa3b8" : "#4d6278", marginBottom: "6px" }}>Saved to:</div>
            <div style={{ backgroundColor: isDark ? "#162030" : "#ffffff", border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`, borderRadius: "6px", padding: "8px 12px", fontSize: "11px", fontFamily: "monospace", color: isDark ? "#e8edf2" : "#1a2530", wordBreak: "break-all" }}>
              {exportedPath}
            </div>
            <div style={{ fontSize: "11px", color: isDark ? "#4d6278" : "#8fa3b8", marginTop: "8px" }}>
              Copy this file to a safe location. It cannot be read without your passphrase.
            </div>
          </div>
        )}
      </div>

      {/* Restore section */}
      <div style={card}>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "#c9922a", marginBottom: "14px" }}>
          🔄 Restore from Backup
        </div>

        <div style={{ backgroundColor: isDark ? "#2a1a0a" : "#fff3e0", border: "0.5px solid #c9922a", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "12px", color: isDark ? "#e8b94a" : "#7a541a" }}>
          ⚠️ Restoring a backup will permanently replace all current data including profiles, journal entries, expenses, and checklists. This cannot be undone.
        </div>

        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "11px", color: isDark ? "#8fa3b8" : "#4d6278", marginBottom: "4px" }}>Backup file (.nsb)</div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input style={{ ...input, flex: 1 }} type="text" placeholder="Select a .nsb backup file…" value={restoreFile} readOnly />
            <button
              onClick={handleBrowse}
              style={{ backgroundColor: isDark ? "#1d2d3f" : "#e8eef5", color: isDark ? "#8fa3b8" : "#4d6278", border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`, borderRadius: "8px", padding: "8px 14px", fontSize: "12px", fontWeight: 500, cursor: "pointer", flexShrink: 0 }}
            >
              Browse…
            </button>
          </div>
        </div>

        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", color: isDark ? "#8fa3b8" : "#4d6278", marginBottom: "4px" }}>Backup passphrase</div>
          <div style={{ position: "relative" }}>
            <input
              style={{ ...input, paddingRight: "40px" }}
              type={showRestorePass ? "text" : "password"}
              placeholder="Enter the passphrase used when exporting"
              value={restorePass}
              onChange={e => setRestorePass(e.target.value)}
            />
            <button onClick={() => setShowRestorePass(!showRestorePass)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: isDark ? "#8fa3b8" : "#4d6278", fontSize: "13px" }}>
              {showRestorePass ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        <div onClick={() => setRestoreConfirmed(!restoreConfirmed)} style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "16px", cursor: "pointer" }}>
          <div style={{ width: "16px", height: "16px", borderRadius: "4px", flexShrink: 0, marginTop: "1px", backgroundColor: restoreConfirmed ? "#c9922a" : "transparent", border: `1.5px solid ${restoreConfirmed ? "#c9922a" : isDark ? "#243347" : "#ccd8e4"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {restoreConfirmed && <span style={{ fontSize: "10px", color: "#0f1923", fontWeight: 700 }}>✓</span>}
          </div>
          <span style={{ fontSize: "12px", color: isDark ? "#8fa3b8" : "#4d6278", lineHeight: 1.5 }}>
            I understand this will permanently replace all current data and cannot be undone.
          </span>
        </div>

        {restoreError && (
          <div style={{ backgroundColor: "#3a1a1a", border: "0.5px solid #7a1a1a", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", fontSize: "13px", color: "#f8b4b4" }}>
            {restoreError}
          </div>
        )}

        {restoreSuccess && (
          <div style={{ backgroundColor: isDark ? "#0f2318" : "#d4f5e3", border: "0.5px solid #1a7a4a", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", fontSize: "13px", color: "#3ecf8e" }}>
            ✅ {restoreSuccess}. Restart the app to see your restored data.
          </div>
        )}

        <button
          onClick={handleRestore}
          disabled={restoring || !restoreFile || !restorePass || !restoreConfirmed}
          style={{ backgroundColor: restoring ? "#7a1a1a" : "#3a1a1a", color: "#f8b4b4", border: "0.5px solid #7a1a1a", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 500, cursor: restoring || !restoreFile || !restorePass || !restoreConfirmed ? "not-allowed" : "pointer", opacity: !restoreFile || !restorePass || !restoreConfirmed ? 0.5 : 1 }}
        >
          {restoring ? "Restoring…" : "Restore from Backup"}
        </button>
      </div>
    </div>
  );
}
