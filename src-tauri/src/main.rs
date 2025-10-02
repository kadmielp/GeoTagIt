#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use little_exif::exif_tag::ExifTag;
use little_exif::metadata::Metadata;

// Removed unused imports for now

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct Geotag {
    lat: f64,
    lng: f64,
}

#[tauri::command]
fn read_geotag(path: String) -> Result<Option<Geotag>, String> {
    let exif_data = rexif::parse_file(&path).map_err(|e| e.to_string())?;

    let mut lat_dms: Option<[f64; 3]> = None;
    let mut lng_dms: Option<[f64; 3]> = None;
    let mut lat_ref: Option<String> = None;
    let mut lng_ref: Option<String> = None;

    for entry in &exif_data.entries {
        match entry.tag {
            rexif::ExifTag::GPSLatitude => {
                if let rexif::TagValue::URational(ref rationals) = entry.value {
                    if rationals.len() >= 3 {
                        let deg = rationals[0].numerator as f64 / rationals[0].denominator as f64;
                        let min = rationals[1].numerator as f64 / rationals[1].denominator as f64;
                        let sec = rationals[2].numerator as f64 / rationals[2].denominator as f64;
                        lat_dms = Some([deg, min, sec]);
                    }
                }
            }
            rexif::ExifTag::GPSLongitude => {
                if let rexif::TagValue::URational(ref rationals) = entry.value {
                    if rationals.len() >= 3 {
                        let deg = rationals[0].numerator as f64 / rationals[0].denominator as f64;
                        let min = rationals[1].numerator as f64 / rationals[1].denominator as f64;
                        let sec = rationals[2].numerator as f64 / rationals[2].denominator as f64;
                        lng_dms = Some([deg, min, sec]);
                    }
                }
            }
            rexif::ExifTag::GPSLatitudeRef => {
                if let rexif::TagValue::Ascii(ref s) = entry.value {
                    lat_ref = Some(s.trim().to_string());
                }
            }
            rexif::ExifTag::GPSLongitudeRef => {
                if let rexif::TagValue::Ascii(ref s) = entry.value {
                    lng_ref = Some(s.trim().to_string());
                }
            }
            _ => {}
        }
    }

    match (lat_dms, lng_dms) {
        (Some([ld, lm, ls]), Some([gd, gm, gs])) => {
            let mut lat = ld + (lm / 60.0) + (ls / 3600.0);
            let mut lng = gd + (gm / 60.0) + (gs / 3600.0);

            if let Some(ref r) = lat_ref {
                if r.eq_ignore_ascii_case("S") { lat = -lat; }
            }
            if let Some(ref r) = lng_ref {
                if r.eq_ignore_ascii_case("W") { lng = -lng; }
            }

            Ok(Some(Geotag { lat, lng }))
        }
        _ => Ok(None),
    }
}

#[derive(Debug, serde::Serialize)]
enum AppError {
    Io(String),
    UnsupportedFileType,
    MetadataParse(String),
    MetadataWrite(String),
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err.to_string())
    }
}

#[tauri::command]
fn write_geotag(path: String, geotag: Geotag) -> Result<(), AppError> {
    use std::path::Path;

    let lower = path.to_lowercase();
    if !(lower.ends_with(".jpg") || lower.ends_with(".jpeg") || lower.ends_with(".tif") || lower.ends_with(".tiff")) {
        return Err(AppError::UnsupportedFileType);
    }

    // Load metadata if present; if the file has no EXIF block, start a new one
    let mut metadata = match Metadata::new_from_path(Path::new(&path)) {
        Ok(m) => m,
        Err(e) => {
            let msg = e.to_string();
            if msg.to_ascii_lowercase().contains("no exif data") {
                Metadata::new()
            } else {
                return Err(AppError::MetadataParse(msg));
            }
        }
    };

    let lat_dms = decimal_to_dms(geotag.lat.abs());
    let lng_dms = decimal_to_dms(geotag.lng.abs());

    metadata.set_tag(ExifTag::GPSLatitude(lat_dms));
    metadata.set_tag(ExifTag::GPSLongitude(lng_dms));

    let lat_ref = if geotag.lat >= 0.0 { "N" } else { "S" };
    let lng_ref = if geotag.lng >= 0.0 { "E" } else { "W" };

    metadata.set_tag(ExifTag::GPSLatitudeRef(lat_ref.to_string()));
    metadata.set_tag(ExifTag::GPSLongitudeRef(lng_ref.to_string()));

    metadata
        .write_to_file(Path::new(&path))
        .map_err(|e| AppError::MetadataWrite(e.to_string()))?;

    Ok(())
}

#[tauri::command]
fn clear_geotag(path: String) -> Result<(), String> {
    use std::path::Path;

    // Load metadata from file path; if none exists, treat as already cleared
    let mut metadata = match Metadata::new_from_path(Path::new(&path)) {
        Ok(m) => m,
        Err(e) => {
            let msg = e.to_string();
            if msg.to_ascii_lowercase().contains("no exif data") {
                return Ok(());
            } else {
                return Err(format!("Failed to parse metadata from path: {}", msg));
            }
        }
    };

    // To clear, remove the specific GPS tags by variant
    metadata.remove_tag(ExifTag::GPSLatitude(Vec::new()));
    metadata.remove_tag(ExifTag::GPSLongitude(Vec::new()));
    metadata.remove_tag(ExifTag::GPSLatitudeRef(String::new()));
    metadata.remove_tag(ExifTag::GPSLongitudeRef(String::new()));

    // Write metadata back to file using crate API
    metadata
        .write_to_file(Path::new(&path))
        .map_err(|e| format!("Failed to write updated file: {}", e))?;

    Ok(())
}

// Helper function to convert decimal degrees to degrees, minutes, seconds
fn decimal_to_dms(decimal: f64) -> Vec<little_exif::rational::uR64> {
    use little_exif::rational::uR64;

    let degrees = decimal.floor() as u32;
    let minutes_float = (decimal - degrees as f64) * 60.0;
    let minutes = minutes_float.floor() as u32;
    let seconds_float = (minutes_float - minutes as f64) * 60.0;
    let seconds = (seconds_float * 1000.0).round() as u32; // Convert to milliseconds for precision

    vec![
        uR64 { nominator: degrees, denominator: 1 },
        uR64 { nominator: minutes, denominator: 1 },
        uR64 { nominator: seconds, denominator: 1000 },
    ]
}


fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![read_geotag, write_geotag, clear_geotag])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}