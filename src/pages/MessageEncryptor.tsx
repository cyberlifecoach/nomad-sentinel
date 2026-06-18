import { useState } from "react";

interface Props {
  isDark: boolean;
}

const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

const te = new TextEncoder();
const td = new TextDecoder();

function randUint32(): number {
  const u = new Uint32Array(1);
  crypto.getRandomValues(u);
  return u[0] >>> 0;
}

function randIndex(max: number): number {
  if (max <= 0) return 0;
  const limit = Math.floor(0x100000000 / max) * max;
  let r: number;
  do { r = randUint32(); } while (r >= limit);
  return r % max;
}

function generatePassphrase(): string {
  const words = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel"];
  const chosen = Array.from({ length: 4 }, () => words[randIndex(words.length)]);
  const num = randIndex(100);
  const sym = SYMBOLS[randIndex(SYMBOLS.length)];
  return chosen.join("-") + num + sym;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function aesGcmEncrypt(
  plainBytes: Uint8Array,
  password: string,
  iterations = 150000
): Promise<object> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey(
    "raw", te.encode(password), "PBKDF2", false, ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plainBytes);
  return {
    v: 1,
    a: "AES-256-GCM",
    i: iterations,
    s: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    ct: arrayBufferToBase64(ciphertext),
  };
}

async function aesGcmDecrypt(envelope: Record<string, unknown>, password: string): Promise<Uint8Array> {
  if (envelope.v !== 1 || envelope.a !== "AES-256-GCM") {
    throw new Error("Unsupported envelope version or algorithm");
  }
  const salt = new Uint8Array(base64ToArrayBuffer(envelope.s as string));
  const iv = new Uint8Array(base64ToArrayBuffer(envelope.iv as string));
  const ciphertext = new Uint8Array(base64ToArrayBuffer(envelope.ct as string));
  const iterations = (envelope.i as number) || 150000;
  const keyMaterial = await crypto.subtle.importKey(
    "raw", te.encode(password), "PBKDF2", false, ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new Uint8Array(plaintext);
}

export default function MessageEncryptor({ isDark }: Props) {
  const [activeTab, setActiveTab] = useState<"text" | "file">("text");

  // Text state
  const [textOp, setTextOp] = useState<"encrypt" | "decrypt">("encrypt");
  const [textInput, setTextInput] = useState("");
  const [textKey, setTextKey] = useState("");
  const [textKeyVisible, setTextKeyVisible] = useState(false);
  const [textResult, setTextResult] = useState("");
  const [textWorking, setTextWorking] = useState(false);

  // File state
  const [fileOp, setFileOp] = useState<"encrypt" | "decrypt">("encrypt");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState("");
  const [fileKeyVisible, setFileKeyVisible] = useState(false);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [processedName, setProcessedName] = useState("");
  const [fileWorking, setFileWorking] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Notification
  const [notice, setNotice] = useState("");

  function showNotice(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  }

  // ── Text handlers ──────────────────────────────────────────
  async function handleProcessText() {
    if (!textInput.trim()) { showNotice("Enter text to process"); return; }
    if (!textKey.trim()) { showNotice("Enter a passphrase"); return; }
    setTextWorking(true);
    try {
      if (textOp === "encrypt") {
        const envelope = await aesGcmEncrypt(te.encode(textInput), textKey);
        setTextResult(JSON.stringify(envelope));
      } else {
        let envelope: Record<string, unknown>;
        try { envelope = JSON.parse(textInput); }
        catch { showNotice("Decrypt expects the JSON envelope produced by this tool"); setTextWorking(false); return; }
        const bytes = await aesGcmDecrypt(envelope, textKey);
        setTextResult(td.decode(bytes));
      }
    } catch {
      showNotice(textOp === "decrypt" ? "Decryption failed — wrong passphrase or corrupted input" : "Encryption failed");
    }
    setTextWorking(false);
  }

  function handleCopyText() {
    if (!textResult) return;
    navigator.clipboard.writeText(textResult).then(() => showNotice("Copied to clipboard"));
  }

  function handleResetText() {
    setTextInput(""); setTextKey(""); setTextResult(""); setTextKeyVisible(false);
  }

  // ── File handlers ──────────────────────────────────────────
  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) { setSelectedFile(file); setProcessedBlob(null); setProcessedName(""); }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) { setSelectedFile(file); setProcessedBlob(null); setProcessedName(""); }
  }

  async function handleProcessFile() {
    if (!selectedFile) { showNotice("Select a file first"); return; }
    if (!fileKey.trim()) { showNotice("Enter a passphrase"); return; }
    setFileWorking(true);
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      if (fileOp === "encrypt") {
        const envelope = await aesGcmEncrypt(new Uint8Array(arrayBuffer), fileKey) as Record<string, unknown>;
        envelope.name = selectedFile.name;
        envelope.mime = selectedFile.type || "application/octet-stream";
        const json = JSON.stringify(envelope);
        setProcessedBlob(new Blob([json], { type: "application/json" }));
        setProcessedName(selectedFile.name + ".enc.json");
      } else {
        let envelope: Record<string, unknown>;
        try { envelope = JSON.parse(td.decode(new Uint8Array(arrayBuffer))); }
        catch { showNotice("File does not appear to be an encrypted envelope"); setFileWorking(false); return; }
        const bytes = await aesGcmDecrypt(envelope, fileKey);
        const mime = (envelope.mime as string) || "application/octet-stream";
        const originalName = (envelope.name as string) || "decrypted_file";
        setProcessedBlob(new Blob([bytes], { type: mime }));
        setProcessedName(originalName);
      }
      showNotice("File processed — click Download to save");
    } catch {
      showNotice(fileOp === "decrypt" ? "Decryption failed — wrong passphrase or corrupted file" : "Encryption failed");
    }
    setFileWorking(false);
  }

  function handleDownloadFile() {
    if (!processedBlob) return;
    const url = URL.createObjectURL(processedBlob);
    const a = document.createElement("a");
    a.href = url; a.download = processedName; a.click();
    URL.revokeObjectURL(url);
  }

  function handleResetFile() {
    setSelectedFile(null); setFileKey(""); setProcessedBlob(null);
    setProcessedName(""); setFileKeyVisible(false);
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  // ── Styles ─────────────────────────────────────────────────
  const card: React.CSSProperties = {
    backgroundColor: isDark ? "#162030" : "#ffffff",
    border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
    borderRadius: "10px",
    padding: "20px",
    marginBottom: "16px",
  };

  const label: React.CSSProperties = {
    fontSize: "11px",
    color: isDark ? "#8fa3b8" : "#4d6278",
    marginBottom: "6px",
    display: "block",
  };

  const input: React.CSSProperties = {
    width: "100%",
    backgroundColor: isDark ? "#0f1923" : "#f0f4f8",
    border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
    borderRadius: "6px",
    padding: "8px 12px",
    color: isDark ? "#e8edf2" : "#1a2530",
    fontSize: "13px",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "system-ui, sans-serif",
  };

  const textarea: React.CSSProperties = {
    ...input,
    resize: "vertical",
    minHeight: "100px",
    fontFamily: "monospace",
    fontSize: "12px",
  };

  const btnPrimary: React.CSSProperties = {
    backgroundColor: "#c9922a",
    color: "#0f1923",
    border: "none",
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  };

  const btnSecondary: React.CSSProperties = {
    backgroundColor: "transparent",
    color: isDark ? "#8fa3b8" : "#4d6278",
    border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "13px",
    cursor: "pointer",
  };

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: "7px 20px",
    fontSize: "13px",
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    border: "none",
    borderBottom: active ? "2px solid #c9922a" : "2px solid transparent",
    backgroundColor: "transparent",
    color: active ? "#c9922a" : (isDark ? "#8fa3b8" : "#4d6278"),
  });

  const opBtn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "6px",
    fontSize: "12px",
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    border: "none",
    borderRadius: "5px",
    backgroundColor: active ? "#c9922a" : "transparent",
    color: active ? "#0f1923" : (isDark ? "#8fa3b8" : "#4d6278"),
  });

  return (
    <div style={{ maxWidth: "640px" }}>

      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "18px", fontWeight: 500 }}>Message & File Encryptor</div>
        <div style={{ fontSize: "12px", color: isDark ? "#8fa3b8" : "#4d6278", marginTop: "2px" }}>
          AES-256-GCM · Compatible with CyberLifeCoach.pro
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        borderBottom: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
        marginBottom: "20px",
      }}>
        <button style={tabBtn(activeTab === "text")} onClick={() => setActiveTab("text")}>Text</button>
        <button style={tabBtn(activeTab === "file")} onClick={() => setActiveTab("file")}>File</button>
      </div>

      {/* ── TEXT TAB ── */}
      {activeTab === "text" && (
        <>
          {/* Op toggle */}
          <div style={card}>
            <div style={{
              display: "flex",
              backgroundColor: isDark ? "#0f1923" : "#f0f4f8",
              borderRadius: "6px",
              padding: "3px",
              gap: "3px",
            }}>
              <button style={opBtn(textOp === "encrypt")} onClick={() => { setTextOp("encrypt"); setTextResult(""); }}>🔒 Encrypt</button>
              <button style={opBtn(textOp === "decrypt")} onClick={() => { setTextOp("decrypt"); setTextResult(""); }}>🔓 Decrypt</button>
            </div>
          </div>

          {/* Input */}
          <div style={card}>
            <span style={label}>{textOp === "encrypt" ? "Message to encrypt" : "Encrypted envelope (JSON)"}</span>
            <textarea
              style={textarea}
              rows={5}
              placeholder={textOp === "encrypt" ? "Enter your message…" : 'Paste the {"v":1,"a":"AES-256-GCM",…} envelope here'}
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
            />
          </div>

          {/* Passphrase */}
          <div style={card}>
            <span style={label}>Passphrase</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  type={textKeyVisible ? "text" : "password"}
                  style={{ ...input, paddingRight: "36px" }}
                  placeholder="Enter a strong passphrase"
                  value={textKey}
                  onChange={e => setTextKey(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  onClick={() => setTextKeyVisible(!textKeyVisible)}
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: isDark ? "#8fa3b8" : "#4d6278" }}
                >
                  {textKeyVisible ? "🙈" : "👁"}
                </button>
              </div>
              <button style={btnSecondary} onClick={() => setTextKey(generatePassphrase())}>Generate</button>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <button style={btnPrimary} onClick={handleProcessText} disabled={textWorking}>
              {textWorking ? "Working…" : textOp === "encrypt" ? "Encrypt" : "Decrypt"}
            </button>
            {textResult && <button style={btnSecondary} onClick={handleCopyText}>Copy result</button>}
            <button style={{ ...btnSecondary, marginLeft: "auto" }} onClick={handleResetText}>Reset</button>
          </div>

          {/* Result */}
          {textResult && (
            <div style={card}>
              <span style={label}>Result</span>
              <textarea
                style={{ ...textarea, minHeight: "80px" }}
                readOnly
                value={textResult}
              />
            </div>
          )}
        </>
      )}

      {/* ── FILE TAB ── */}
      {activeTab === "file" && (
        <>
          {/* Op toggle */}
          <div style={card}>
            <div style={{
              display: "flex",
              backgroundColor: isDark ? "#0f1923" : "#f0f4f8",
              borderRadius: "6px",
              padding: "3px",
              gap: "3px",
            }}>
              <button style={opBtn(fileOp === "encrypt")} onClick={() => { setFileOp("encrypt"); setProcessedBlob(null); }}>🔒 Encrypt</button>
              <button style={opBtn(fileOp === "decrypt")} onClick={() => { setFileOp("decrypt"); setProcessedBlob(null); }}>🔓 Decrypt</button>
            </div>
          </div>

          {/* Drop zone */}
          <div style={card}>
            <span style={label}>{fileOp === "encrypt" ? "File to encrypt" : "Encrypted file (.enc.json)"}</span>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              style={{
                border: `1.5px dashed ${dragOver ? "#c9922a" : (isDark ? "#243347" : "#ccd8e4")}`,
                borderRadius: "8px",
                padding: "24px",
                textAlign: "center",
                cursor: "pointer",
                backgroundColor: dragOver ? (isDark ? "#1d2d3f" : "#f5f0e8") : "transparent",
                transition: "all 0.15s",
              }}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              {selectedFile ? (
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500 }}>{selectedFile.name}</div>
                  <div style={{ fontSize: "11px", color: isDark ? "#8fa3b8" : "#4d6278", marginTop: "4px" }}>{formatSize(selectedFile.size)}</div>
                </div>
              ) : (
                <div style={{ fontSize: "13px", color: isDark ? "#8fa3b8" : "#4d6278" }}>
                  Drop a file here or click to browse
                </div>
              )}
            </div>
            <input id="file-input" type="file" style={{ display: "none" }} onChange={handleFileSelect} />
          </div>

          {/* Passphrase */}
          <div style={card}>
            <span style={label}>Passphrase</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  type={fileKeyVisible ? "text" : "password"}
                  style={{ ...input, paddingRight: "36px" }}
                  placeholder="Enter a strong passphrase"
                  value={fileKey}
                  onChange={e => setFileKey(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  onClick={() => setFileKeyVisible(!fileKeyVisible)}
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: isDark ? "#8fa3b8" : "#4d6278" }}
                >
                  {fileKeyVisible ? "🙈" : "👁"}
                </button>
              </div>
              <button style={btnSecondary} onClick={() => setFileKey(generatePassphrase())}>Generate</button>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <button style={btnPrimary} onClick={handleProcessFile} disabled={fileWorking}>
              {fileWorking ? "Working…" : "Process file"}
            </button>
            {processedBlob && <button style={btnSecondary} onClick={handleDownloadFile}>Download result</button>}
            <button style={{ ...btnSecondary, marginLeft: "auto" }} onClick={handleResetFile}>Reset</button>
          </div>

          {/* Result confirmation */}
          {processedBlob && (
            <div style={{
              ...card,
              borderLeft: "2px solid #1a7a4a",
            }}>
              <div style={{ fontSize: "13px", fontWeight: 500, color: isDark ? "#3ecf8e" : "#1a7a4a", marginBottom: "4px" }}>
                ✓ File processed
              </div>
              <div style={{ fontSize: "12px", color: isDark ? "#8fa3b8" : "#4d6278" }}>
                {processedName} · Click Download to save
              </div>
            </div>
          )}
        </>
      )}

      {/* Toast */}
      {notice && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          backgroundColor: "#c9922a",
          color: "#0f1923",
          padding: "10px 18px",
          borderRadius: "8px",
          fontSize: "13px",
          fontWeight: 500,
          zIndex: 1000,
        }}>
          {notice}
        </div>
      )}
    </div>
  );
}