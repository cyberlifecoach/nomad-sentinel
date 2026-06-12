use exif::{Exif, In, Reader, Tag};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize, Debug)]
pub struct ExifField {
    pub tag: String,
    pub value: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ScrubReport {
    pub file_path: String,
    pub fields_found: Vec<ExifField>,
    pub has_gps: bool,
    pub scrubbed: bool,
    pub output_path: String,
    pub error: Option<String>,
}

fn read_exif(path: &Path) -> Result<Exif, String> {
    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut bufreader = std::io::BufReader::new(file);
    let exif = Reader::new()
        .read_from_container(&mut bufreader)
        .map_err(|e| e.to_string())?;
    Ok(exif)
}

fn extract_fields(exif: &Exif) -> Vec<ExifField> {
    let interesting_tags = vec![
        Tag::Make,
        Tag::Model,
        Tag::DateTime,
        Tag::DateTimeOriginal,
        Tag::DateTimeDigitized,
        Tag::GPSLatitude,
        Tag::GPSLongitude,
        Tag::GPSAltitude,
        Tag::GPSLatitudeRef,
        Tag::GPSLongitudeRef,
        Tag::Software,
        Tag::Artist,
        Tag::Copyright,
        Tag::ImageDescription,
        Tag::UserComment,
        ];

    let mut fields = Vec::new();
    for tag in &interesting_tags {
        if let Some(field) = exif.get_field(*tag, In::PRIMARY) {
            fields.push(ExifField {
                tag: format!("{}", tag),
                value: format!("{}", field.display_value()),
            });
        }
    }
    fields
}

fn has_gps_data(exif: &Exif) -> bool {
    exif.get_field(Tag::GPSLatitude, In::PRIMARY).is_some()
        || exif.get_field(Tag::GPSLongitude, In::PRIMARY).is_some()
}

/// Dry run — read EXIF fields without modifying anything
#[tauri::command]
pub fn scan_exif(file_path: String) -> ScrubReport {
    let path = Path::new(&file_path);

    match read_exif(path) {
        Ok(exif) => {
            let fields = extract_fields(&exif);
            let has_gps = has_gps_data(&exif);
            ScrubReport {
                file_path: file_path.clone(),
                fields_found: fields,
                has_gps,
                scrubbed: false,
                output_path: String::new(),
                error: None,
            }
        }
        Err(e) => ScrubReport {
            file_path: file_path.clone(),
            fields_found: vec![],
            has_gps: false,
            scrubbed: false,
            output_path: String::new(),
            error: Some(format!("Could not read EXIF: {}", e)),
        },
    }
}

/// Scrub — copy file to output path with EXIF stripped
/// Strategy: read raw JPEG bytes, locate and zero out EXIF APP1 segment
#[tauri::command]
pub fn scrub_file(file_path: String, output_path: String) -> ScrubReport {
    let path = Path::new(&file_path);
    let out_path = Path::new(&output_path);

    // First scan so we can report what was removed
    let scan = match read_exif(path) {
        Ok(exif) => {
            let fields = extract_fields(&exif);
            let has_gps = has_gps_data(&exif);
            (fields, has_gps)
        }
        Err(_) => (vec![], false),
    };

    // Read raw bytes
    let bytes = match fs::read(path) {
        Ok(b) => b,
        Err(e) => {
            return ScrubReport {
                file_path,
                fields_found: scan.0,
                has_gps: scan.1,
                scrubbed: false,
                output_path,
                error: Some(format!("Could not read file: {}", e)),
            }
        }
    };

    // Strip EXIF APP1 segments from JPEG
    let cleaned = strip_jpeg_exif(&bytes);

    // Write to output path
    if let Some(parent) = out_path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            return ScrubReport {
                file_path,
                fields_found: scan.0,
                has_gps: scan.1,
                scrubbed: false,
                output_path,
                error: Some(format!("Could not create output directory: {}", e)),
            };
        }
    }

    match fs::write(out_path, &cleaned) {
        Ok(_) => ScrubReport {
            file_path,
            fields_found: scan.0,
            has_gps: scan.1,
            scrubbed: true,
            output_path,
            error: None,
        },
        Err(e) => ScrubReport {
            file_path,
            fields_found: scan.0,
            has_gps: scan.1,
            scrubbed: false,
            output_path,
            error: Some(format!("Could not write output: {}", e)),
        },
    }
}

/// Strip EXIF APP1 marker segments from JPEG bytes
/// JPEG structure: FF D8 (SOI) followed by segments FF XX len_hi len_lo data
/// APP1 = FF E1, which is where EXIF lives
fn strip_jpeg_exif(data: &[u8]) -> Vec<u8> {
    if data.len() < 2 || data[0] != 0xFF || data[1] != 0xD8 {
        // Not a JPEG — return as-is
        return data.to_vec();
    }

    let mut result = vec![0xFF, 0xD8]; // SOI marker
    let mut i = 2;

    while i + 1 < data.len() {
        if data[i] != 0xFF {
            // Not a marker — copy remainder and stop
            result.extend_from_slice(&data[i..]);
            break;
        }

        let marker = data[i + 1];

        // SOS (Start of Scan) — everything after is image data, copy and stop
        if marker == 0xDA {
            result.extend_from_slice(&data[i..]);
            break;
        }

        // EOI (End of Image)
        if marker == 0xD9 {
            result.push(0xFF);
            result.push(0xD9);
            break;
        }

        // Standalone markers with no length (RST0-RST7, SOI)
        if marker == 0xD8 || (0xD0..=0xD7).contains(&marker) {
            result.push(0xFF);
            result.push(marker);
            i += 2;
            continue;
        }

        // All other segments have a 2-byte length field
        if i + 3 >= data.len() {
            break;
        }

        let len = ((data[i + 2] as usize) << 8) | (data[i + 3] as usize);
        let segment_end = i + 2 + len;

        if segment_end > data.len() {
            break;
        }

        // APP1 (0xE1) = EXIF — skip it entirely
        if marker == 0xE1 {
            i = segment_end;
            continue;
        }

        // All other segments — copy through
        result.extend_from_slice(&data[i..segment_end]);
        i = segment_end;
    }

    result
}