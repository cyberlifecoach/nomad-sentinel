import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [version, setVersion] = useState("");
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    invoke<string>("get_app_version").then(setVersion);
  }, []);

  return (
    <div className={isDark ? "dark" : ""} style={{ height: "100vh" }}>
      <div style={{
        height: "100vh",
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        gridTemplateRows: "48px 1fr",
        backgroundColor: isDark ? "#0f1923" : "#f0f4f8",
        color: isDark ? "#e8edf2" : "#1a2530",
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
      }}>

        {/* Topbar */}
        <div style={{
          gridColumn: "1 / -1",
          backgroundColor: "#1a3a5c",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: "12px",
          borderBottom: "1px solid #7a541a",
        }}>
          <div style={{
            width: "28px", height: "28px",
            backgroundColor: "#c9922a",
            borderRadius: "6px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px", flexShrink: 0,
          }}>🛡</div>
          <span style={{ fontSize: "15px", fontWeight: 500, color: "#fff" }}>
            Nomad Sentinel
          </span>
          <span style={{ fontSize: "11px", color: "#c9922a" }}>v{version}</span>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: "rgba(255,255,255,0.08)",
              border: "0.5px solid rgba(255,255,255,0.15)",
              borderRadius: "20px", padding: "4px 10px 4px 6px", cursor: "pointer",
            }}>
              <div style={{
                width: "20px", height: "20px", borderRadius: "50%",
                backgroundColor: "#c9922a",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "10px", fontWeight: 500, color: "#0f1923",
              }}>M</div>
              <div>
                <div style={{ fontSize: "12px", color: "#e8edf2" }}>Marc</div>
                <div style={{ fontSize: "10px", color: "#c9922a", fontWeight: 500 }}>Nomad Mode</div>
              </div>
            </div>
            <button
              onClick={() => setIsDark(!isDark)}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "0.5px solid rgba(255,255,255,0.15)",
                borderRadius: "8px", padding: "6px 10px",
                cursor: "pointer", color: "#e8edf2", fontSize: "14px",
              }}
            >
              {isDark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{
          backgroundColor: isDark ? "#162030" : "#ffffff",
          borderRight: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
          padding: "12px 0",
          display: "flex", flexDirection: "column", gap: "2px",
          overflowY: "auto",
        }}>
          <NavSection label="Security" />
          <NavItem icon="🛡" label="Setup wizard" isDark={isDark} />
          <NavItem icon="⚠️" label="Emergency toolkit" isDark={isDark} badge="!" />
          <NavItem icon="🔍" label="Metadata scrubber" isDark={isDark} />

          <NavSection label="Travel" />
          <NavItem icon="📊" label="Dashboard" isDark={isDark} active />
          <NavItem icon="📓" label="Journal" isDark={isDark} />
          <NavItem icon="✅" label="Packing lists" isDark={isDark} />
          <NavItem icon="💰" label="Expenses" isDark={isDark} />
          <NavItem icon="🌍" label="Country guide" isDark={isDark} />
          <NavItem icon="💬" label="Phrasebook" isDark={isDark} />

          <div style={{
            marginTop: "auto", paddingTop: "12px",
            borderTop: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
          }}>
            <NavItem icon="💾" label="Backup" isDark={isDark} />
            <NavItem icon="⚙️" label="Settings" isDark={isDark} />
            <NavItem icon="❓" label="Help" isDark={isDark} />
          </div>
        </div>

        {/* Main content */}
        <div style={{
          backgroundColor: isDark ? "#0f1923" : "#f0f4f8",
          padding: "20px", overflowY: "auto",
        }}>
          {/* Page header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <div style={{ fontSize: "18px", fontWeight: 500 }}>Dashboard</div>
              <div style={{ fontSize: "12px", color: isDark ? "#8fa3b8" : "#4d6278", marginTop: "2px" }}>
                Nomad Mode · All systems go
              </div>
            </div>
            <button style={{
              backgroundColor: "#c9922a", color: "#0f1923",
              border: "none", borderRadius: "8px",
              padding: "7px 14px", fontSize: "13px", fontWeight: 500, cursor: "pointer",
            }}>
              + New entry
            </button>
          </div>

          {/* Status bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            backgroundColor: isDark ? "#162030" : "#ffffff",
            border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
            borderRadius: "8px", padding: "8px 14px", marginBottom: "18px",
          }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#1a7a4a" }} />
            <span style={{ fontSize: "12px", color: isDark ? "#8fa3b8" : "#4d6278" }}>
              Session unlocked · All data encrypted at rest
            </span>
            <span style={{ marginLeft: "auto", fontSize: "11px", color: "#c9922a" }}>
              🔒 AES-256-GCM
            </span>
          </div>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "18px" }}>
            <StatCard label="Journal entries" value="24" sub="Last: yesterday" isDark={isDark} />
            <StatCard label="Trip expenses" value="$1,840" sub="12 categories" isDark={isDark} />
            <StatCard label="Active country" value="Portugal" sub="Lisbon · Low risk" isDark={isDark} />
            <StatCard label="Packing lists" value="3" sub="1 active" isDark={isDark} />
          </div>

          {/* Quick access */}
          <div style={{ fontSize: "13px", fontWeight: 500, marginBottom: "10px", color: isDark ? "#c9922a" : "#b07d1a" }}>
            ⚡ Quick access
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "18px" }}>
            <FeatureCard label="Encrypted journal" desc="Private entries, encrypted locally with your passphrase" badge="Encrypted" isDark={isDark} />
            <FeatureCard label="Country guide" desc="Border rules, scams, SIM laws for 18 countries" badge="18 countries" isDark={isDark} />
            <FeatureCard label="Emergency toolkit" desc="Exit checklists, encrypted contacts, secure deletion" badge="Offline" isDark={isDark} />
          </div>
        </div>

      </div>
    </div>
  );
}

// Sub-components
function NavSection({ label }: { label: string }) {
  return (
    <div style={{ padding: "8px 16px 4px", fontSize: "10px", fontWeight: 500, color: "#4d6278", letterSpacing: "0.08em", textTransform: "uppercase" }}>
      {label}
    </div>
  );
}

function NavItem({ icon, label, isDark, active, badge }: {
  icon: string; label: string; isDark: boolean; active?: boolean; badge?: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "10px",
      padding: "8px 16px", cursor: "pointer",
      color: active ? "#e8b94a" : (isDark ? "#8fa3b8" : "#4d6278"),
      borderLeft: active ? "2px solid #c9922a" : "2px solid transparent",
      backgroundColor: active ? (isDark ? "#1d2d3f" : "#e8eef5") : "transparent",
    }}>
      <span style={{ fontSize: "15px", width: "20px" }}>{icon}</span>
      <span style={{ fontSize: "13px" }}>{label}</span>
      {badge && (
        <span style={{
          marginLeft: "auto", backgroundColor: isDark ? "#7a541a" : "#e8d5a8",
          color: isDark ? "#e8b94a" : "#7a541a",
          fontSize: "10px", padding: "2px 6px", borderRadius: "10px", fontWeight: 500,
        }}>{badge}</span>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, isDark }: {
  label: string; value: string; sub: string; isDark: boolean;
}) {
  return (
    <div style={{
      backgroundColor: isDark ? "#162030" : "#ffffff",
      border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
      borderLeft: "2px solid #c9922a",
      borderRadius: "8px", padding: "12px",
    }}>
      <div style={{ fontSize: "11px", color: isDark ? "#4d6278" : "#8fa3b8", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "20px", fontWeight: 500 }}>{value}</div>
      <div style={{ fontSize: "11px", color: isDark ? "#8fa3b8" : "#4d6278", marginTop: "2px" }}>{sub}</div>
    </div>
  );
}

function FeatureCard({ label, desc, badge, isDark }: {
  label: string; desc: string; badge: string; isDark: boolean;
}) {
  return (
    <div style={{
      backgroundColor: isDark ? "#162030" : "#ffffff",
      border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
      borderRadius: "10px", padding: "14px", cursor: "pointer",
    }}>
      <div style={{ fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "11px", color: isDark ? "#8fa3b8" : "#4d6278", lineHeight: 1.5, marginBottom: "8px" }}>{desc}</div>
      <span style={{
        fontSize: "10px", padding: "2px 7px", borderRadius: "10px", fontWeight: 500,
        backgroundColor: isDark ? "rgba(26,122,74,0.2)" : "#d4f5e3",
        color: isDark ? "#3ecf8e" : "#1a7a4a",
      }}>{badge}</span>
    </div>
  );
}

export default App;