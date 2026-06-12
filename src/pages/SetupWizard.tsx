import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Props {
  isDark: boolean;
  profileId: number;
}

interface CheckItem {
  key: string;
  label: string;
  description: string;
  link?: string;
}

interface Step {
  id: string;
  title: string;
  icon: string;
  summary: string;
  items: CheckItem[];
}

const STEPS: Step[] = [
  {
    id: "vpn",
    title: "VPN Setup",
    icon: "🔒",
    summary: "A VPN encrypts your traffic and masks your IP on untrusted networks. Essential at airports, cafes, and hotels.",
    items: [
      { key: "vpn.chosen", label: "Choose a no-log VPN provider", description: "Recommended: Mullvad, ProtonVPN, or IVPN. Avoid free VPNs.", link: "https://mullvad.net" },
      { key: "vpn.installed", label: "Install and configure the VPN client", description: "Download from the provider official site. Verify the installer checksum if provided." },
      { key: "vpn.killswitch", label: "Enable kill switch", description: "Blocks all traffic if the VPN drops. Find it in your VPN app settings." },
      { key: "vpn.tested", label: "Verify VPN is working", description: "Connect then visit ipleak.net. Confirm your real IP and DNS are not visible.", link: "https://ipleak.net" },
      { key: "vpn.autoconnect", label: "Set VPN to auto-connect on untrusted networks", description: "Enable auto-connect for all networks except your known home network." },
    ],
  },
  {
    id: "browser",
    title: "Browser Hardening",
    icon: "🌐",
    summary: "Your browser is your largest attack surface. These steps reduce tracking, block malicious scripts, and limit fingerprinting.",
    items: [
      { key: "browser.firefox", label: "Use Firefox or a hardened Chromium browser", description: "Firefox offers the best balance of privacy and usability. Brave is a good Chromium alternative." },
      { key: "browser.ublock", label: "Install uBlock Origin", description: "The most effective content blocker available. Enable EasyPrivacy in filter lists.", link: "https://ublockorigin.com" },
      { key: "browser.https", label: "Enable HTTPS-Only mode", description: "Firefox: Settings -> Privacy and Security -> HTTPS-Only Mode -> Enable in all windows." },
      { key: "browser.telemetry", label: "Disable browser telemetry", description: "Firefox: Settings -> Privacy and Security -> uncheck all Firefox Data Collection boxes." },
      { key: "browser.fingerprint", label: "Reduce fingerprinting exposure", description: "Firefox: set privacy.resistFingerprinting to true in about:config." },
      { key: "browser.passwords", label: "Disable built-in password manager", description: "Use Bitwarden or KeePassXC instead. Disable in Settings -> Privacy and Security -> Logins." },
    ],
  },
  {
    id: "dns",
    title: "DNS over HTTPS",
    icon: "🛡",
    summary: "Standard DNS is unencrypted. Your ISP can see every domain you visit. DoH encrypts DNS queries.",
    items: [
      { key: "dns.understand", label: "Understand what DNS over HTTPS protects", description: "DoH encrypts domain lookups. Without it anyone on your network sees which sites you visit." },
      { key: "dns.firefox", label: "Enable DoH in Firefox", description: "Settings -> Privacy and Security -> DNS over HTTPS -> Max Protection. Choose Cloudflare or NextDNS.", link: "https://nextdns.io" },
      { key: "dns.provider", label: "Choose a privacy-respecting DoH provider", description: "Recommended: NextDNS, Cloudflare 1.1.1.1, or Quad9. Avoid your ISP DNS." },
      { key: "dns.os", label: "Set system-level DoH for stronger protection", description: "Windows 11: Settings -> Network -> DNS -> Manual -> Enter DoH server address." },
      { key: "dns.verified", label: "Verify DoH is active", description: "Visit 1.1.1.1/help to confirm encrypted DNS is resolving correctly.", link: "https://1.1.1.1/help" },
    ],
  },
  {
    id: "sync",
    title: "Encrypted Sync",
    icon: "☁️",
    summary: "Cloud sync is risky on travel networks. These options provide end-to-end encryption or local-only alternatives.",
    items: [
      { key: "sync.audit", label: "Audit what you sync to the cloud", description: "List every service syncing your data. Decide what needs to be online vs what can stay local." },
      { key: "sync.bitwarden", label: "Use Bitwarden or KeePassXC for passwords", description: "Bitwarden is E2E encrypted and open source. KeePassXC is fully offline.", link: "https://bitwarden.com" },
      { key: "sync.syncthing", label: "Consider Syncthing for file sync", description: "Syncs files directly between devices over local network or relay. No cloud account required.", link: "https://syncthing.net" },
      { key: "sync.proton", label: "Use ProtonDrive or Cryptomator for cloud files", description: "ProtonDrive offers E2E encrypted storage. Cryptomator encrypts folders before cloud sync.", link: "https://proton.me/drive" },
      { key: "sync.offline", label: "Set up an offline backup routine", description: "Use Nomad Sentinel backup to export an encrypted archive to a USB drive before travel." },
      { key: "sync.reviewed", label: "Review app permissions for cloud access", description: "Revoke access for apps you no longer use. Audit Storage permissions on mobile." },
    ],
  },
];

const TOTAL_ITEMS = STEPS.reduce((sum, s) => sum + s.items.length, 0);

export default function SetupWizard({ isDark, profileId }: Props) {
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set());
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const card = {
    backgroundColor: isDark ? "#162030" : "#ffffff",
    border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
    borderRadius: "10px",
    padding: "16px",
  };

  useEffect(() => {
    invoke<{ item_key: string; completed: boolean; updated_at: string }[]>("get_setup_progress", { profileId })
      .then((items) => {
        const keys = new Set(items.filter((i) => i.completed).map((i) => i.item_key));
        setCompletedKeys(keys);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [profileId]);

  async function toggleItem(key: string) {
    const nowCompleted = !completedKeys.has(key);
    setCompletedKeys((prev) => {
      const next = new Set(prev);
      nowCompleted ? next.add(key) : next.delete(key);
      return next;
    });
    try {
      await invoke("toggle_setup_item", { profileId, itemKey: key, completed: nowCompleted });
    } catch (e) {
      setCompletedKeys((prev) => {
        const next = new Set(prev);
        nowCompleted ? next.delete(key) : next.add(key);
        return next;
      });
      setError(String(e));
    }
  }

  const completedCount = completedKeys.size;
  const progressPct = Math.round((completedCount / TOTAL_ITEMS) * 100);
  const stepCompletedCount = (step: Step) =>
    step.items.filter((i) => completedKeys.has(i.key)).length;

  if (loading) {
    return (
      <div style={{ color: isDark ? "#8fa3b8" : "#4d6278", fontSize: "13px", padding: "40px", textAlign: "center" }}>
        Loading progress...
      </div>
    );
  }

  const step = STEPS[activeStep];

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "18px", fontWeight: 500 }}>Secure Setup Wizard</div>
        <div style={{ fontSize: "12px", color: isDark ? "#8fa3b8" : "#4d6278", marginTop: "2px" }}>
          Advisory checklist — no system changes are made automatically
        </div>
      </div>

      {error && <div style={{ fontSize: "12px", color: "#e05c5c", marginBottom: "12px" }}>{error}</div>}

      <div style={{ ...card, marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: 500 }}>Overall progress</span>
          <span style={{ fontSize: "12px", color: "#c9922a", fontWeight: 500 }}>{completedCount} / {TOTAL_ITEMS} completed</span>
        </div>
        <div style={{ height: "6px", borderRadius: "3px", backgroundColor: isDark ? "#243347" : "#e0e8f0" }}>
          <div style={{
            height: "100%", borderRadius: "3px",
            backgroundColor: progressPct === 100 ? "#1a7a4a" : "#c9922a",
            width: `${progressPct}%`,
            transition: "width 0.3s ease",
          }} />
        </div>
        {progressPct === 100 && (
          <div style={{ fontSize: "12px", color: "#3ecf8e", marginTop: "8px", fontWeight: 500 }}>
            Setup complete — your device is hardened for travel
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {STEPS.map((s, i) => {
          const done = stepCompletedCount(s);
          const total = s.items.length;
          const isActive = i === activeStep;
          return (
            <button
              key={s.id}
              onClick={() => setActiveStep(i)}
              style={{
                flex: 1, padding: "10px 8px", borderRadius: "8px",
                border: isActive ? "1.5px solid #c9922a" : `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
                backgroundColor: isActive ? (isDark ? "#1d2d3f" : "#fdf3e3") : (isDark ? "#162030" : "#ffffff"),
                cursor: "pointer", textAlign: "center" as const,
              }}
            >
              <div style={{ fontSize: "18px", marginBottom: "4px" }}>{s.icon}</div>
              <div style={{ fontSize: "11px", fontWeight: 500, color: isActive ? "#c9922a" : (isDark ? "#8fa3b8" : "#4d6278") }}>{s.title}</div>
              <div style={{ fontSize: "10px", color: done === total ? "#3ecf8e" : (isDark ? "#4d6278" : "#8fa3b8"), marginTop: "2px" }}>{done}/{total}</div>
            </button>
          );
        })}
      </div>

      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <span style={{ fontSize: "22px" }}>{step.icon}</span>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 500 }}>{step.title}</div>
            <div style={{ fontSize: "11px", color: isDark ? "#8fa3b8" : "#4d6278", marginTop: "2px", lineHeight: 1.5 }}>{step.summary}</div>
          </div>
        </div>

        <div style={{ height: "0.5px", backgroundColor: isDark ? "#243347" : "#ccd8e4", margin: "12px 0" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {step.items.map((item) => {
            const done = completedKeys.has(item.key);
            return (
              <div
                key={item.key}
                onClick={() => toggleItem(item.key)}
                style={{
                  display: "flex", gap: "12px", padding: "12px", borderRadius: "8px",
                  backgroundColor: done ? (isDark ? "rgba(26,122,74,0.1)" : "#f0fdf6") : (isDark ? "#0f1923" : "#f8fafc"),
                  border: `0.5px solid ${done ? (isDark ? "rgba(26,122,74,0.3)" : "#a8e6c4") : (isDark ? "#243347" : "#ccd8e4")}`,
                  cursor: "pointer",
                }}
              >
                <div style={{
                  width: "20px", height: "20px", borderRadius: "5px", flexShrink: 0,
                  border: done ? "none" : `1.5px solid ${isDark ? "#4d6278" : "#8fa3b8"}`,
                  backgroundColor: done ? "#1a7a4a" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", marginTop: "1px",
                }}>
                  {done && <span style={{ color: "#fff", fontSize: "12px", fontWeight: 700 }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: "13px", fontWeight: 500, marginBottom: "4px",
                    color: done ? (isDark ? "#3ecf8e" : "#1a7a4a") : (isDark ? "#e8edf2" : "#1a2530"),
                    textDecoration: done ? "line-through" : "none",
                  }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: "12px", color: isDark ? "#8fa3b8" : "#4d6278", lineHeight: 1.6 }}>
                    {item.description}
                  </div>
                  {item.link && !done && (
                    <span style={{ display: "inline-block", marginTop: "6px", fontSize: "11px", color: "#c9922a" }}>
                      {item.link}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
          <button
            onClick={() => setActiveStep((p) => Math.max(0, p - 1))}
            disabled={activeStep === 0}
            style={{
              background: "none",
              border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
              borderRadius: "6px", padding: "7px 14px", fontSize: "13px",
              cursor: activeStep === 0 ? "not-allowed" : "pointer",
              color: activeStep === 0 ? (isDark ? "#4d6278" : "#8fa3b8") : (isDark ? "#e8edf2" : "#1a2530"),
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: "12px", color: isDark ? "#4d6278" : "#8fa3b8", alignSelf: "center" }}>
            Step {activeStep + 1} of {STEPS.length}
          </span>
          <button
            onClick={() => setActiveStep((p) => Math.min(STEPS.length - 1, p + 1))}
            disabled={activeStep === STEPS.length - 1}
            style={{
              backgroundColor: activeStep === STEPS.length - 1 ? "transparent" : "#c9922a",
              border: activeStep === STEPS.length - 1 ? `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}` : "none",
              borderRadius: "6px", padding: "7px 14px", fontSize: "13px",
              cursor: activeStep === STEPS.length - 1 ? "not-allowed" : "pointer",
              color: activeStep === STEPS.length - 1 ? (isDark ? "#4d6278" : "#8fa3b8") : "#0f1923",
              fontWeight: 500,
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}