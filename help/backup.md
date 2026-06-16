# Backup & Export

Create an encrypted archive of your data for safekeeping. Store it on a USB drive, an external hard drive, or any location you control. All backups are encrypted with your profile passphrase.

---

## What is included in a backup

| Data | Included |
|---|---|
| Journal entries | ✅ Yes — encrypted |
| Emergency contacts | ✅ Yes — encrypted |
| Exit checklist | ✅ Yes |
| Setup Wizard progress | ✅ Yes |
| Profile settings | ✅ Yes |
| Expense history | ✅ Yes |
| Phrasebook custom phrases | ✅ Yes |
| Country checklist notes | ✅ Yes |
| Packing lists | ✅ Yes |
| Built-in app data | ❌ No — reinstalled with the app |

---

## Creating a backup

1. Click **Backup** in the sidebar.
2. Click **Create Backup**.
3. Choose a destination folder.
4. Click **Save**.

The backup is written as an encrypted archive to the location you selected. The filename includes the profile name and date:

---

## Restoring from a backup

1. Click **Backup** in the sidebar.
2. Click **Restore from Backup**.
3. Select your `.backup` file.
4. Enter the passphrase that was active when the backup was created.
5. Click **Restore**.

> **Restoring overwrites all current data in the active profile.** Export a fresh backup first if you want to preserve your current state before restoring.

---

## Storing your backup safely

A backup is only as secure as where you store it. Recommendations:

- **USB drive** — keep it separate from your laptop when traveling
- **Hardware-encrypted drive** — adds a second layer of protection if the drive is lost or seized
- **Do not store in cloud services** — defeats the purpose of local-first encryption

---

## Exporting individual data

In addition to full backups, individual features support their own exports:

| Feature | Export format |
|---|---|
| Expense Tracker | CSV — see [Expense Tracker](expenses.md) |
| Packing Checklists | CSV — see [Packing Checklists](packing-checklists.md) |
| Journal | Included in full backup only |
| Emergency contacts | Included in full backup only |

---

## Backup integrity

Every backup includes a checksum. When you restore, Nomad Sentinel verifies the checksum before writing any data. If the file has been tampered with or corrupted, the restore is cancelled and you are notified.

---

## Important notes

> **Use the passphrase that was active when the backup was created.** If you changed your passphrase after the backup was made, the old passphrase is required to restore that backup.

> **There is no cloud backup in v1.** All backups are local files that you manage yourself. This is by design.

> **Test your backup before you travel.** Create a backup, then restore it to confirm it works. Do not wait until you need it to find out it is corrupted.