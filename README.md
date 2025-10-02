# GeoTagIt

GeoTagIt is a modern, cross-platform desktop application designed for intuitive and efficient geotagging of your photos. Built with a focus on user experience and performance, it provides a simple way to add, edit, and view location data for your image library. The application can be run as a standalone desktop app (powered by Tauri) for full file system access or directly in a web browser with slightly limited functionality.

## Key Features

*   **Direct File Modification**: In its primary desktop mode, GeoTagIt reads and writes EXIF geotag data directly to your image files (JPEG & TIFF), ensuring the changes are permanent and recognized by other software.
*   **Interactive Map Tagger**:
    *   Visually pin locations by clicking directly on a world map.
    *   Fine-tune coordinates by dragging the map pin.
    *   Manually input precise latitude and longitude for expert control.
*   **Instant Location Search**: Get real-time address suggestions as you type, powered by OpenStreetMap's Nominatim geocoding service.
*   **Efficient Multi-Photo Workflow**: Select and tag multiple photos at once. Standard `Click` and `Ctrl/Cmd + Click` controls make batch editing simple.
*   **Multiple Views**:
    *   **Editor View**: A side-by-side layout to view your photo list, preview selected images, and access the geotagging panel.
    *   **World View**: See all your geotagged photos plotted on a global map.
*   **Photo Filtering**: Quickly filter your collection to show all, geotagged, or untagged photos.
*   **Light & Dark Modes**: A beautifully crafted interface that adapts to your preference and saves your choice.
*   **Browser Mode**: Can be run in a web browser. In this mode, instead of modifying files directly, it allows you to download a new copy of the image with the geotag data embedded.

## Technologies Used

*   **Frontend**: React (v18) with TypeScript
*   **Desktop Runtime**: Tauri (with a Rust backend)
*   **Styling**: Tailwind CSS
*   **Mapping**: Leaflet.js & OpenStreetMap
*   **Geocoding**: OpenStreetMap Nominatim
*   **EXIF Handling**:
    *   `rexif` / `little_exif` (Rust crates) for robust EXIF metadata manipulation in the desktop app.
    *   A custom TypeScript-based EXIF writer for the browser-based fallback.

## How to Run the Application

### Prerequisites

*   Node.js and npm
*   Rust and Cargo
*   On Windows, install Visual Studio Build Tools (C++ workload) for Tauri

### Development Mode (Desktop/Tauri)

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Run the desktop app in dev**:
    ```bash
    npm run tauri dev
    ```
    This launches the Tauri window pointing at the Vite dev server. Drag & drop photos or use the Add Photos button. Thumbnails should render using the Tauri asset protocol.

### Development Mode (Browser-only)

The app can also run purely in the browser with limited file access (EXIF writes are not persisted to disk):

```bash
npm run dev
```
Open the printed local URL. In this mode, geotag writes produce downloadable images.

### Building for Production

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Build the application**:
    ```bash
    npm run tauri build
    ```
    This will create a standalone executable in `src-tauri/target/release/`.

After installation, run GeoTagIt and add photos. Thumbnails should display in the sidebar, the main preview, and in World View markers.

## Troubleshooting Thumbnails (Tauri)

If thumbnails do not appear after build:

- Ensure you are adding photos via native dialog or drag & drop so paths are real filesystem paths.
- We rely on `convertFileSrc(file.path)` to produce Tauri-safe URLs.
- We configure the Tauri security and protocol to allow these URLs:
  - `src-tauri/tauri.conf.json` sets:
    - Production CSP to allow `blob:` and `data:` in `img-src`.
    - Asset protocol `scope: ["**/*"]` to serve any local path resolved by `convertFileSrc`.
    - Dev CSP includes `asset:`/`https://asset.localhost` so images work in dev.
- Use DevTools (Ctrl+Shift+I) in the app and check the `<img src>`:
  - It should be an `asset://` or `https://asset.localhost/...` URL, not a raw `C:\...` path.
  - If it’s a raw path, verify that Tauri dev/build is used and that `App.tsx` logs show “Data URL created from path:”.

## Keyboard and Selection

- Click to select a photo, Ctrl/Cmd+Click to multi-select.
- Use the search box in the Geotagger to find a location, or click the map to set coordinates, then “Apply Geotag to Photo”.

## Potential Improvements

*   **Error Handling**: Improve error handling for EXIF writing, especially for unsupported file formats or corrupted metadata.
*   **Undo/Redo**: Implement an undo/redo system for geotagging actions.
*   **Map Enhancements**: Add more map layers (e.g., satellite, terrain) and features like displaying a heatmap of photo locations.
*   **Metadata Panel**: Create a panel to display all existing EXIF metadata for a selected photo.
*   **Performance**: For very large photo libraries, virtualize the photo list to improve rendering performance.
