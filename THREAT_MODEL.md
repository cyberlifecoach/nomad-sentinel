# Threat Model

This document describes the security assumptions, trust boundaries, and known limitations of Nomad Sentinel. It is written for users who want to understand what protection the app actually provides before trusting it with sensitive data, and for contributors who need to reason about security when proposing changes.

This is a living document. It reflects the architecture as of v1.0.0 and will be updated as the app evolves.

---

## 1. Scope and Assumptions

Nomad Sentinel is designed to protect data at rest on a device the user controls. It assumes:

- The user's device is not already compromised by malware, a keylogger, or a remote access tool at the time of use
- The user chooses a passphrase that is not trivially guessable
- The operating system's file permission model is functioning as intended

**Out of scope.** Nomad Sentinel cannot protect against:

- A device seized or accessed while already unlocked and the session active
- A user coerced into disclosing their passphrase
- Malware already present on the device with the privileges to read process memory
- Physical keyloggers or shoulder-surfing
- Compromise of the operating system itself (Nomad Sentinel trusts the OS it runs on)

These are stated plainly because no application-layer encryption can defend against a compromised endpoint or a coerced user. Understanding this boundary matters most for the journalist and high-risk-traveler audience this app is built for.

---

## 2. Assets

What Nomad Sentinel is protecting, in rough order of sensitivity:

| Asset | Why it matters |
|---|---|
| Journal entries | Personal, potentially incriminating or identity-revealing reflections |
| Encrypted emergency contacts | Could endanger named individuals if exposed |
| Passphrase (in memory, during an active session) | Compromise here defeats every other protection |
| Expense records | Lower sensitivity, but can reveal location, spending patterns, and travel timeline |
| Country checklist overrides, packing lists, phrasebook customizations | Low sensitivity; mostly user convenience data |
| Decrypted plaintext, transiently, during Message & File Encryptor use | Sensitive only for the duration it exists in memory |

The passphrase and the journal are the assets the architecture is built around. Everything else inherits weaker protection by design, since not all data warrants the same handling cost.

---

## 3. Trust Boundaries

Nomad Sentinel has a few clear boundaries where trust changes hands:

**The OS file system boundary.** All persistent data lives in the OS-standard application data directory. Nomad Sentinel trusts the OS to enforce normal file permissions; it does not implement its own access control on top of the file system.

**The Tauri IPC boundary.** The React frontend and the Rust backend communicate over Tauri's `invoke()` bridge. The frontend is sandboxed inside the OS-native webview and cannot directly touch the file system, the database, or cryptographic key material — it must go through a Rust command. This boundary is the main defense against a compromised or malicious web-layer dependency reaching outside the webview.

**The key derivation boundary.** Before a passphrase is run through Argon2id (journal, profiles) or PBKDF2-SHA-256 (Message & File Encryptor), it exists as plaintext in memory for the shortest practical window. After derivation, the raw passphrase is discarded; only the derived key and, for the active session, the data it unlocks remain in memory.

**The session boundary.** Currently, Journal operations pass the passphrase and salt as parameters on each `invoke()` call rather than relying on a persistent unlocked-session model. This is a known divergence from the original design intent (see Section 6).

---

## 4. Threat Actors

| Actor | Capability | Primary concern |
|---|---|---|
| Opportunistic device thief | Physical access to a lost or stolen device, no specific targeting | Reading journal entries or contacts without the passphrase |
| Border agent / device inspector | Physical access, may compel unlocking, time-limited | Forced disclosure, plausible deniability is out of scope |
| Network observer (ISP, hostile Wi-Fi) | Can see network traffic | Mitigated by design — Nomad Sentinel makes no network calls in normal operation |
| Malicious or compromised local process | Code execution on the same device, outside Nomad Sentinel | Reading process memory, intercepting passphrase entry |
| Supply chain (compromised dependency) | Code execution via a malicious crate or npm package | Backdoored builds, data exfiltration baked into a dependency |

The most realistic threat for this audience is the first two: a lost or seized device. The architecture is built primarily around protecting data at rest against exactly that scenario.

---

## 5. Mitigations

**Encryption at rest.** All sensitive fields (journal entries, encrypted contact cards, profile data) are encrypted with AES-256-GCM. Keys are derived per-profile from a user passphrase using Argon2id, a memory-hard key derivation function chosen specifically to resist offline brute-force and GPU-accelerated cracking attempts — a meaningful distinction from older PBKDF2-only designs.

**No passphrase storage.** The passphrase itself is never written to disk. It is requested fresh each session and discarded from application state once the derived key is established.

**Per-profile key isolation.** Each traveler profile (Journalist Mode, Nomad Mode, custom) derives its own independent encryption key. Compromising one profile's passphrase does not expose other profiles on the same device. This matters concretely for the journalist use case: handing an unlocked device to a colleague for one profile does not expose another.

**Zero telemetry, zero default network activity.** Nomad Sentinel makes no outbound network calls unless a feature explicitly requires one (e.g., a future FX rate refresh). There is no analytics, crash reporting, or usage tracking. This removes an entire class of exposure: a network observer watching for unusual traffic from the app, or a vendor server that could itself be compromised or subpoenaed.

**Webview sandboxing.** The Tauri architecture confines the frontend to a sandboxed webview. Even if a frontend dependency were compromised, it cannot reach the file system or cryptographic operations without going through the Rust IPC boundary, which acts as a chokepoint for any malicious frontend code.

**Advisory-only system changes.** The Secure Setup Wizard and Metadata Scrubber do not make system or file changes without explicit user confirmation. The Metadata Scrubber in particular operates on a copy of a file by default; the original is untouched unless the user confirms an overwrite.

**Cross-tool encryption portability.** The Message & File Encryptor intentionally uses PBKDF2-SHA-256 (matching the CyberLifeCoach.pro web tool) rather than Argon2id, so ciphertext is portable between the desktop app and the website. This is a deliberate trade-off: slightly weaker key stretching than Argon2id, in exchange for genuine interoperability for a feature meant to be used to communicate with people who may not have Nomad Sentinel installed.

**Open source.** The full source is publicly auditable under the MIT license. There is no closed, unauditable component.

---

## 6. Known Limitations

This section is deliberately candid. A threat model that only lists strengths is not a threat model.

- **No memory scrubbing.** Decrypted plaintext (journal entries while being viewed, message contents during encryption/decryption) is not actively zeroed out of memory after use. It relies on normal OS memory management and garbage collection. A sufficiently capable attacker with code execution on the device could potentially recover recently-decrypted data from memory.
- **Session-inheritance model not yet implemented.** The original design intent (PRD section 9.1) called for CLI subcommands to inherit an unlocked GUI session via a local socket/named pipe, so a passphrase is never passed through CLI arguments or shell history. The current implementation instead passes the passphrase and salt as parameters on each Rust command invocation from React component state. This works correctly but does not yet match the stronger isolation model originally planned.
- **Unmaintained transitive dependencies (Linux build).** A `cargo audit` scan identifies several GTK3-binding crates (`atk`, `gdk`, `gtk`, and related `-sys` packages) pulled in transitively through Tauri's Linux webview support, flagged as unmaintained upstream. These are not currently associated with known exploited vulnerabilities, but their unmaintained status means future vulnerabilities in this dependency chain may go unpatched upstream. This is tracked and will be reassessed as Tauri's own dependency tree evolves.
- **No protection against a compromised host OS.** Nomad Sentinel has no way to detect or defend against a keylogger, a compromised kernel, or a malicious process running with sufficient privilege on the same machine.
- **No plausible deniability.** The app does not attempt to hide its own existence, the existence of encrypted data, or provide a decoy/duress passphrase. A device inspector who finds Nomad Sentinel installed will know encrypted data likely exists, even without being able to read it.
- **Manual updates only.** There is no auto-update mechanism. Users who don't manually check GitHub Releases may run outdated builds with unpatched issues for an extended period.

---

## 7. Reporting a Vulnerability

If you discover a security issue in Nomad Sentinel, please report it privately rather than opening a public GitHub issue, so it can be addressed before the details are public.

Contact: cyberlifecoach@proton.me

Please include:
- A description of the issue and its potential impact
- Steps to reproduce, if applicable
- The version of Nomad Sentinel affected

We will acknowledge reports and work toward a fix and coordinated disclosure timeline.

---

*This threat model will be revisited at each major version release. Last updated for v1.0.0.*
