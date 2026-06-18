# Changelog

All notable changes to Nomad Sentinel are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Message & File Encryptor — AES-256-GCM + PBKDF2-SHA-256 text and file encryption, with output portable to the CyberLifeCoach.pro web encryptor
- Passphrase generator for the Message & File Encryptor
- Exit guard — Ctrl+Q/Cmd+Q confirmation when unsaved changes exist in Journal or Expense Tracker

### Changed
- Dashboard "New entry" button now navigates to a new journal entry instead of being non-functional

### Removed
- Digital Footprint Scanner removed from feature scope (was never implemented). Replaced by the Message & File Encryptor.

### Planned for v1.0.0
- Apple notarization and Windows Authenticode code signing
- GitHub Actions release pipeline
- `THREAT_MODEL.md` published

---

## [0.6.0] — Help System

### Added
- In-app help system: 11 bundled markdown help files rendered via a slide-in panel
- Sidebar navigation and search across all help topics
- Context-sensitive help: F1 keyboard shortcut, topbar help button, and sidebar Help nav item, all aware of the currently active page

## [0.5.0] — Expense Tracker

### Added
- Expense entry, categorization, and summary view
- Offline FX rate tables with CSV export

## [0.4.0] — Travel Tools

### Added
- Packing checklist templates with full CRUD for custom lists
- Country Security Checklists — 18-country starter set covering border rules, local scams, SIM card laws, and cyber risk level
- Offline Phrasebook with scenario-based phrase organization

## [0.3.0] — Security Tools

### Added
- Secure Setup Wizard — advisory-only guidance for VPN selection, browser hardening, and DNS-over-HTTPS
- Emergency Toolkit — encrypted contact cards, exit checklists, secure file-deletion scripts
- Metadata Scrubber — EXIF/GPS stripping with dry-run mode, operates on a copy by default

## [0.2.0] — Journal & Backup

### Added
- Encrypted Journal — create, list, view, search, and delete entries, encrypted at rest
- Export/Backup as a single encrypted archive with integrity check on restore

## [0.1.0] — Scaffold

### Added
- Initial Tauri v2 project scaffold (Rust backend + React/TypeScript frontend)
- SQLite local storage via `rusqlite`
- Argon2id key derivation
- Settings & Profiles — create, switch, and passphrase-protect named traveler profiles
- Base navigation shell and CI pipeline foundation
