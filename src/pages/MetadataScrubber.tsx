import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

interface Props {
  isDark: boolean;
}

interface ExifField {
  tag: string;
  value: string;
}

interface ScrubReport {
  file_path: string;
  fields_found: ExifField[];
  has_gps: boolean;
  scrubbed: boolean;
  output_path: string;
  error: string | null;
}

export default function MetadataScrubber({ isDark }: Props) {
  const [report, setReport] = useState<ScrubReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const card = {
    backgroundColor: isDark ? "#162030" : "#ffffff",
    border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
    borderRadius: "10px",
    padding: "16px",
  };

  async function selectAndScan() {
    setError("");
    setReport(null);
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png"] }],
      });
      if (!selected) return;
      const filePath = typeof selected === "string" ? selected : selected[0];
      setLoading(true);
      const result = await invoke<ScrubReport>("scan_exif", { filePath });
      setReport(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function scrub() {
    if (!report) return;
    setLoading(true);
    setError("");
    try {
      // Build output path: same directory, filename + _scrubbed
      const filePath = report.file_path;
      const lastDot = filePath.lastIndexOf(".");
      const lastSep = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
      const name = filePath.substring(lastSep + 1, lastDot);
      const ext = filePath.substring(lastDot);
      const dir = filePath.substring(0, lastSep + 1);
      const outputPath = `${dir}${name}_scrubbed${ext}`;

      const result = await invoke<ScrubReport>("scrub_file", {
        filePath,
        outputPath,
      });
      setReport(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "18px", fontWeight: 500 }}>Metadata Scrubber</div>
        <div style={{ fontSize: "12px", color: isDark ? "#8fa3b8" : "#4d6278", marginTop: "2px" }}>
          Strip EXIF and GPS data from images before sharing. Always operates on a copy.
        </div>
      </div>

      {error && <div style={{ fontSize: "12px", color: "#e05c5c", marginBottom: "12px" }}>{error}</div>}

      {/* Info card */}
      <div style={{ ...card, marginBottom: "16px", backgroundColor: isDark ? "rgba(201,146,42,0.08)" : "#fdf3e3", border: `0.5px solid ${isDark ? "#7a541a" : "#e8d5a8"}` }}>
        <div style={{ fontSize: "12px", color: isDark ? "#c9922a" : "#7a541a", fontWeight: 500, marginBottom: "4px" }}>
          How this works
        </div>
        <div style={{ fontSize: "12px", color: isDark ? "#8fa3b8" : "#4d6278", lineHeight: 1.7 }}>
          Select a JPEG or PNG file. The scanner shows all EXIF metadata found including GPS coordinates, device info, and timestamps.
          Clicking Scrub creates a clean copy with all EXIF removed — your original file is never modified.
        </div>
      </div>

      {/* Select file button */}
      <button
        onClick={selectAndScan}
        disabled={loading}
        style={{
          backgroundColor: "#c9922a", color: "#0f1923",
          border: "none", borderRadius: "8px",
          padding: "9px 18px", fontSize: "13px", fontWeight: 500,
          cursor: loading ? "not-allowed" : "pointer",
          marginBottom: "16px",
        }}
      >
        {loading ? "Scanning..." : "Select image to scan"}
      </button>

      {/* Report */}
      {report && (
        <div>
          {/* File info */}
          <div style={{ ...card, marginBottom: "12px" }}>
            <div style={{ fontSize: "13px", fontWeight: 500, marginBottom: "8px" }}>
              {report.file_path.split(/[\\/]/).pop()}
            </div>

            {report.error ? (
              <div style={{ fontSize: "12px", color: "#e05c5c" }}>{report.error}</div>
            ) : (
              <>
                <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                  <span style={{
                    fontSize: "11px", padding: "2px 8px", borderRadius: "10px", fontWeight: 500,
                    backgroundColor: report.fields_found.length > 0
                      ? (isDark ? "rgba(224,92,92,0.15)" : "#fde8e8")
                      : (isDark ? "rgba(26,122,74,0.15)" : "#d4f5e3"),
                    color: report.fields_found.length > 0
                      ? "#e05c5c"
                      : (isDark ? "#3ecf8e" : "#1a7a4a"),
                  }}>
                    {report.fields_found.length > 0
                      ? `${report.fields_found.length} EXIF fields found`
                      : "No EXIF data found"}
                  </span>
                  {report.has_gps && (
                    <span style={{
                      fontSize: "11px", padding: "2px 8px", borderRadius: "10px", fontWeight: 500,
                      backgroundColor: isDark ? "rgba(224,92,92,0.15)" : "#fde8e8",
                      color: "#e05c5c",
                    }}>
                      GPS data present
                    </span>
                  )}
                  {report.scrubbed && (
                    <span style={{
                      fontSize: "11px", padding: "2px 8px", borderRadius: "10px", fontWeight: 500,
                      backgroundColor: isDark ? "rgba(26,122,74,0.15)" : "#d4f5e3",
                      color: isDark ? "#3ecf8e" : "#1a7a4a",
                    }}>
                      Scrubbed successfully
                    </span>
                  )}
                </div>

                {/* EXIF fields table */}
                {report.fields_found.length > 0 && (
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 500, color: "#c9922a", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Fields to be removed
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {report.fields_found.map((field, i) => (
                        <div key={i} style={{
                          display: "flex", gap: "12px",
                          backgroundColor: isDark ? "#0f1923" : "#f8fafc",
                          borderRadius: "6px", padding: "6px 10px",
                          fontSize: "12px",
                        }}>
                          <span style={{ color: "#e05c5c", fontWeight: 500, minWidth: "140px", flexShrink: 0 }}>
                            {field.tag}
                          </span>
                          <span style={{ color: isDark ? "#8fa3b8" : "#4d6278", wordBreak: "break-all" }}>
                            {field.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Output path if scrubbed */}
                {report.scrubbed && report.output_path && (
                  <div style={{
                    backgroundColor: isDark ? "#0f1923" : "#f0fdf6",
                    border: `0.5px solid ${isDark ? "rgba(26,122,74,0.3)" : "#a8e6c4"}`,
                    borderRadius: "6px", padding: "8px 12px",
                    fontSize: "12px", color: isDark ? "#3ecf8e" : "#1a7a4a",
                    marginBottom: "12px",
                  }}>
                    Clean copy saved to: {report.output_path}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "8px" }}>
                  {!report.scrubbed && report.fields_found.length > 0 && (
                    <button
                      onClick={scrub}
                      disabled={loading}
                      style={{
                        backgroundColor: "#e05c5c", color: "#fff",
                        border: "none", borderRadius: "6px",
                        padding: "7px 14px", fontSize: "13px", fontWeight: 500,
                        cursor: loading ? "not-allowed" : "pointer",
                      }}
                    >
                      {loading ? "Scrubbing..." : "Scrub — create clean copy"}
                    </button>
                  )}
                  {!report.scrubbed && report.fields_found.length === 0 && (
                    <div style={{ fontSize: "12px", color: isDark ? "#3ecf8e" : "#1a7a4a" }}>
                      This file has no EXIF data — safe to share as-is.
                    </div>
                  )}
                  <button
                    onClick={selectAndScan}
                    style={{
                      background: "none",
                      border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
                      borderRadius: "6px", padding: "7px 14px",
                      fontSize: "13px", cursor: "pointer",
                      color: isDark ? "#8fa3b8" : "#4d6278",
                    }}
                  >
                    Scan another file
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}