# Encrypted Journal

Write private entries that are encrypted locally with your passphrase. No one can read your journal without it — not even if they have access to your device or the app's data files.

---

## How it works

Each entry is encrypted using AES-256-GCM before it is written to disk. Your passphrase is never stored — it is used to derive an encryption key each session via Argon2id. If you forget your passphrase, your entries cannot be recovered.

---

## Writing an entry

1. Click **Journal** in the sidebar.
2. Click **New Entry**.
3. Enter a title and write your entry.
4. Click **Save**. The entry is encrypted and stored immediately.

---

## Reading an entry

1. Click **Journal** in the sidebar.
2. Click any entry in the list to open it.
3. The entry is decrypted in memory for display. It is never written to disk in plaintext.

---

## Deleting an entry

1. Open the entry you want to delete.
2. Click **Delete**.
3. Confirm when prompted. Deletion is permanent and cannot be undone.

---

## Searching entries

Use the search bar at the top of the journal list to filter by title. Entry bodies are not searched in v1 — titles only.

---

## Backing up your journal

Your journal entries are included in the encrypted backup archive. See [Backup & Export](backup.md) for instructions.

---

## Important notes

> **If you forget your passphrase, your entries cannot be recovered.** There is no reset option by design. Store your passphrase somewhere safe.

> **Each profile has its own passphrase.** Journal entries belong to the profile they were created under. Switching profiles requires re-entering that profile's passphrase.