# Nomad Sentinel

*Plan smarter. Travel safer. Stay private — anywhere.*

A privacy-first desktop application for digital nomads, journalists, privacy-conscious travelers, and remote workers. Runs locally on Windows, macOS, and Linux with no cloud accounts, no telemetry, and no internet connection required.

Your data stays on your device, encrypted, under your control.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](#installation)

---

## Features

| | Feature | Description |
|---|---|---|
| 🔐 | **Encrypted Journal** | Create, search, and manage private journal entries. AES-256-GCM with Argon2id key derivation. |
| 🛡 | **Secure Setup Wizard** | Guided, advisory-only walkthrough for VPN selection, browser hardening, and DNS-over-HTTPS. |
| 🚨 | **Emergency Toolkit** | Generate encrypted contact cards, exit checklists, and secure file-deletion scripts. |
| ⚙️ | **Metadata Scrubber** | Strip EXIF and GPS data from JPEG/PNG files. Dry-run mode, operates on a copy by default. |
| 🔒 | **Message & File Encryptor** | Encrypt/decrypt text and files with AES-256-GCM + PBKDF2-SHA-256. Output is portable with the [CyberLifeCoach.pro](https://cyberlifecoach.pro) web encryptor. |
| 📋 | **Packing Checklists** | Pre-built templates by trip type, with full CRUD for custom lists. |
| 🛃 | **Country Security Checklists** | Border rules, local scams, SIM card laws, and cyber risk level for an 18-country starter set. |
| 💬 | **Offline Phrasebook** | Essential phrases across multiple languages, organized by scenario. |
| 💰 | **Expense Tracker** | Categorized expense tracking with offline FX rate tables and CSV export. |
| 👤 | **Settings & Profiles** | Multiple traveler profiles (Journalist Mode, Nomad Mode, custom), each with its own encryption key. |
| 📤 | **Export & Backup** | Single encrypted archive of journal, lists, phrasebooks, and config, with integrity check on restore. |
| ❓ | **Help & Exit** | Searchable in-app manual, F1 context-sensitive help, unsaved-changes guard on quit. |

## Why Nomad Sentinel

Most security and travel tools force a choice between productivity and privacy. Cloud-based apps track usage. Subscription tools gate the features travelers actually need.

Nomad Sentinel makes no outbound network calls unless a feature explicitly requires one. All sensitive data is encrypted at rest using a passphrase-derived key — the passphrase itself is never stored. Every line of code is open source and auditable.

---

## Installation

Pre-built binaries are published on [GitHub Releases](https://github.com/marclarouche/nomad-sentinel/releases).

| Platform | Format |
|---|---|
| Windows | `.exe` (NSIS installer) |
| macOS | `.dmg` / `.pkg` |
| Linux | `.AppImage` / `.deb` |

Download the binary for your platform, run the installer, and launch Nomad Sentinel. No account, no internet connection, and no additional runtime required.

> Nomad Sentinel uses a manual update model. Check the Releases page periodically for new versions — there is no auto-update mechanism by design.

---

## Verifying Downloads

### Linux

All Linux release artifacts are GPG signed. To verify:

1. Download `nomad-sentinel-signing-key.asc` from the release assets and import it:
```bash
   gpg --import nomad-sentinel-signing-key.asc
```

2. Verify the signature against the binary:
```bash
   gpg --verify nomad-sentinel_x86_64.AppImage.asc nomad-sentinel_x86_64.AppImage
```

3. Check the SHA256 checksum against `checksums.txt` in the release assets:
```bash
   sha256sum -c checksums.txt
```

**Signing key fingerprint:** `BB5ABED9E398F6B9C6DB2FA82C734E777EE1F87F`
**Key owner:** Marc Larouche \<cyberlifecoach@proton.me\>

### Windows

The Windows binary is currently unsigned. You may see a SmartScreen warning on first launch — click "More info" then "Run anyway" to proceed. Windows Authenticode signing is on the roadmap for a future release.

To verify the authenticity of your download, check the SHA256 checksum against `checksums.txt` in the release assets:

```powershell
Get-FileHash nomad-sentinel_x.x.x_x64-setup.exe -Algorithm SHA256
```

### macOS

Coming with v1.0. macOS binaries will be signed with a Developer ID certificate and notarized by Apple.

---

## Building from Source

### Prerequisites

- [Node.js](https://nodejs.org/) v24 or later
- [Rust](https://www.rust-lang.org/tools/install) 1.96 or later
- [Tauri CLI](https://tauri.app/start/prerequisites/) and its platform-specific system dependencies

### Setup

```bash
git clone https://github.com/marclarouche/nomad-sentinel.git
cd nomad-sentinel
npm install
```

### Development

```bash
npm run tauri dev
```

This launches the app with hot reload. Note: running the Vite dev server alone (`npm run dev`) will show `invoke` errors in the console — the Tauri bridge is only available when running through `npm run tauri dev`.

### Production Build

```bash
npm run tauri build
```

Outputs a platform-specific installer in `src-tauri/target/release/bundle/`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Tailwind CSS |
| Backend | Rust (Tauri v2) |
| Local storage | SQLite via `rusqlite` |
| Encryption | AES-256-GCM, Argon2id key derivation |
| CLI | Tauri CLI passthrough — same binary exposes GUI and CLI subcommands |

Binary size: 3–10 MB. No Python, no Node runtime, no external dependencies required at install time.

---

## Security

Nomad Sentinel is built with a security-first architecture:

- **Zero telemetry.** No analytics, crash reporting, or usage tracking of any kind.
- **Zero network calls** unless a feature explicitly requires one (e.g., future FX rate refresh).
- **Encrypted at rest.** All sensitive data uses passphrase-derived AES-256-GCM encryption via Argon2id.
- **Passphrases are never stored.** Keys are derived fresh each session.

A full threat model is documented in [`THREAT_MODEL.md`](THREAT_MODEL.md).

If you discover a security vulnerability, please report it privately rather than opening a public issue. Contact: cyberlifecoach@proton.me

---

## Who This Is For

| Audience | Primary need |
|---|---|
| Digital nomads | All-in-one travel productivity without cloud dependency |
| Journalists | Encrypted notes, emergency toolkit, metadata scrubbing before file sharing |
| Privacy-conscious travelers | Device security hardening without requiring technical expertise |
| Remote workers | Expense tracking, packing checklists, country-specific safety information |

---

## Contributing

Contributions are welcome.

1. Fork the repository and clone it locally
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes with clear, atomic commits
4. Open a pull request describing the change and its purpose

Please open an issue first for significant features so scope can be discussed before work begins.

---

## License

[MIT](LICENSE) — free to use, modify, and share with attribution.

---

## Links

Built by [CyberLife Coach](https://cyberlifecoach.pro)

- Substack: [cyberlifecoach.substack.com](https://cyberlifecoach.substack.com)
- BlueSky: [@cyberlifecoach.bsky.social](https://bsky.app/profile/cyberlifecoach.bsky.social)