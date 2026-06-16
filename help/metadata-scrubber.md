# Metadata Scrubber

Strip GPS coordinates, camera make and model, timestamps, and other identifying metadata from JPEG and PNG files before sharing them. This is especially important for journalists and travelers who need to protect their location and identity.

---

## Why this matters

Every photo taken on a smartphone or digital camera contains embedded EXIF data. This can include:

- **GPS coordinates** — the exact location where the photo was taken
- **Device information** — make, model, and serial number of your camera or phone
- **Timestamps** — date and time the photo was taken
- **Software information** — the app or OS used to capture or edit the image

Sharing a photo without scrubbing this data can reveal your location, your device, and your movements to anyone who receives the file.

---

## Supported file types

- JPEG (.jpg, .jpeg)
- PNG (.png)

---

## How to scrub a file

1. Click **Metadata Scrubber** in the sidebar.
2. Click **Select File** and choose the image you want to scrub.
3. Click **Scan** to run a dry-run report showing all metadata fields found in the file.
4. Review the report.
5. Click **Scrub File** to remove the metadata.

---

## Dry-run mode

The scrubber always shows you a report of what will be removed before making any changes. This is the scan step. No files are modified until you click **Scrub File**.

---

## How files are handled

By default, the scrubber creates a cleaned copy of the file and leaves the original untouched. The copy is saved in the same folder as the original with `_scrubbed` appended to the filename.

> **Example:** `photo.jpg` → `photo_scrubbed.jpg`

If you want to overwrite the original, confirm when prompted after clicking **Scrub File**.

---

## Verifying the result

After scrubbing, click **Scan** on the cleaned file to confirm the metadata has been removed. A clean file will show no GPS, device, or identifying fields.

---

## Important notes

> **Scrubbing is not reversible on the original if you choose to overwrite.** Use the default copy mode unless you are certain you do not need the original.

> **Video files are not supported in v1.** Only JPEG and PNG are processed. Video metadata scrubbing is planned for a future release.

> **Scrubbing removes metadata only.** The visual content of the image is not changed in any way.