# Settings & Profiles

Create and switch between named traveler profiles. Each profile has its own passphrase, encryption key, and data store. Switching profiles requires re-entering that profile's passphrase.

---

## Why profiles exist

Different travel situations call for different security postures. A journalist covering a sensitive story has different needs than a nomad on a beach workation. Profiles let you maintain separate identities, data sets, and feature configurations in one app.

A colleague can use their own profile on your device without ever seeing your data.

---

## Built-in profile modes

| Mode | Features surfaced by default |
|---|---|
| Journalist Mode | Encrypted Journal, Emergency Toolkit, Metadata Scrubber, Secure Setup Wizard |
| Nomad Mode | Expense Tracker, Packing Checklists, Country Checklists, Phrasebook |
| Minimal Mode | All features accessible, no defaults surfaced |

All features remain accessible from the full sidebar regardless of active mode.

---

## Creating a profile

1. Click **Settings** in the sidebar.
2. Click **New Profile**.
3. Enter a profile name.
4. Select a mode — Journalist, Nomad, or Minimal.
5. Enter and confirm a passphrase.
6. Click **Create Profile**.

> **Your passphrase is not stored anywhere.** If you forget it, the data in that profile cannot be recovered. Choose a strong passphrase and store it somewhere safe.

---

## Switching profiles

1. Click the profile indicator in the top bar.
2. Select the profile you want to switch to.
3. Enter that profile's passphrase when prompted.
4. The app reloads with that profile's data and settings.

---

## Profile settings

Each profile stores its own:

- Theme preference — dark or light mode
- Default export path
- Preferred currency for the Expense Tracker
- Home country for the Country Checklists
- Setup Wizard progress
- Feature mode configuration

---

## Changing your passphrase

1. Click **Settings** in the sidebar.
2. Click **Change Passphrase**.
3. Enter your current passphrase to confirm your identity.
4. Enter and confirm your new passphrase.
5. Click **Save**.

> **Changing your passphrase re-encrypts all data in the active profile.** This may take a moment depending on how much data the profile contains.

---

## Deleting a profile

1. Click **Settings** in the sidebar.
2. Click **Delete Profile**.
3. Enter your passphrase to confirm.
4. Confirm when prompted.

> **Profile deletion is permanent and cannot be undone.** All journal entries, contacts, checklists, expenses, and settings for that profile are deleted immediately. Export a backup first if you need to preserve the data.

---

## Important notes

> **Each profile uses a separate encryption key derived from its own passphrase.** Data from one profile cannot be accessed from another, even on the same device.

> **There is no master password or recovery option.** This is by design. A recovery mechanism would undermine the security model.