# GeoTagIt v1.0.0

GeoTagIt is a modern, cross-platform desktop application designed for intuitive and efficient geotagging of your photos. Built with a focus on user experience and performance, it provides a simple way to add, edit, and view location data for your image library.

## Key Features

*   **Direct File Modification**: Reads and writes EXIF geotag data directly to your image files (JPEG & TIFF), ensuring changes are permanent and recognized by other software.
*   **Interactive Map Tagger**: Visually pin locations by clicking directly on a world map, fine-tune coordinates by dragging, or manually input precise latitude and longitude.
*   **Instant Location Search**: Get real-time address suggestions as you type, powered by OpenStreetMap's Nominatim geocoding service.
*   **Advanced Multi-Select**: 
    *   Toggle multi-select mode with a dedicated checkbox button
    *   Click photos to toggle selection without deselecting others
    *   Select All/Clear All functionality
    *   Visual selection counter and check icons
*   **Smart Photo Organization**:
    *   Group photos by folder with sticky headers
    *   Filter by all, geotagged, or untagged photos
    *   Clean border-only selection design
*   **Multiple Views**:
    *   **Editor View**: Side-by-side layout with photo list, preview, and geotagging panel
    *   **World View**: See all geotagged photos plotted on a global map with circular thumbnails
*   **Modern UI**: Light & dark modes with beautiful, responsive design
*   **Cross-Platform**: Runs as desktop app (Tauri) or in web browser

## Technologies Used

*   **Frontend**: React 18 with TypeScript
*   **Desktop Runtime**: Tauri with Rust backend
*   **Styling**: Tailwind CSS
*   **Mapping**: Leaflet.js & OpenStreetMap
*   **Geocoding**: OpenStreetMap Nominatim
*   **EXIF Handling**: `rexif`/`little_exif` (Rust) for desktop, custom TypeScript EXIF writer for browser

## Quick Start

### Desktop App (Recommended)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run in development**:
   ```bash
   npm run tauri dev
   ```

3. **Build for production**:
   ```bash
   npm run tauri build
   ```

### Browser Mode

```bash
npm run dev
```

## Usage

1. **Add Photos**: Click the "+" button or drag & drop photos
2. **Multi-Select**: Click the checkbox button to enable multi-select mode
3. **Select Photos**: Click photos to toggle selection (cyan border + check icon)
4. **Geotag**: Use the map, search, or manual input to set coordinates
5. **Apply**: Click "Apply Geotag" to save location data to selected photos
6. **View**: Switch to World View to see all geotagged photos on the map

## Changelog

### v1.0.0 - Initial Release

#### New Features
- **Multi-Select Mode**: Dedicated checkbox button to enable/disable multi-select
- **Smart Selection**: Click photos to toggle selection without deselecting others
- **Selection Counter**: Shows "X selected" in header when photos are selected
- **Select All/Clear All**: Quick buttons for batch selection operations
- **Photo Grouping**: Group photos by folder with sticky headers
- **Visual Selection Indicators**: Cyan borders and check icons for selected photos
- **Circular Map Thumbnails**: Clean circular photo thumbnails in World View
- **Improved UI Controls**: Separate multi-select toggle from filter buttons

#### UI Improvements
- **Clean Selection Design**: Border-only selection without cluttered checkboxes
- **Better Visual Hierarchy**: Clear separation between different control types
- **Smart Icon Positioning**: Prevents overlap between selection, geotag, and error indicators
- **Enhanced Hover States**: Better feedback for interactive elements
- **Responsive Layout**: Improved spacing and alignment

#### Technical Improvements
- **Optimized Selection Logic**: Efficient multi-select state management
- **Memoized Grouping**: Performance-optimized photo grouping calculations
- **Better Error Handling**: Improved positioning of error indicators
- **Type Safety**: Enhanced TypeScript interfaces and prop types

#### Bug Fixes
- **Fixed Duplicate Buttons**: Removed confusing duplicate grid icons
- **Improved Icon Semantics**: Proper icons for different functions (checkbox for multi-select, collection for grouping)
- **Better State Management**: Consistent selection behavior across different modes

## System Requirements

- **Desktop**: Windows, macOS, or Linux
- **Browser**: Modern web browser with JavaScript enabled
- **File Formats**: JPEG and TIFF for geotag writing (other formats supported for viewing)

## Troubleshooting

### Thumbnails Not Showing (Desktop)
- Ensure photos are added via native dialog or drag & drop
- Check that `convertFileSrc()` is working in DevTools
- Verify Tauri security settings in `tauri.conf.json`

### Geotag Not Saving
- Only JPEG and TIFF files support EXIF geotag writing
- Ensure file permissions allow writing
- Check for file corruption or unsupported formats

## Contributing

This project uses modern web technologies and follows React best practices. Contributions are welcome!

## License

See LICENSE file for details.