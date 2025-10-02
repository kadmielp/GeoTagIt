# Changelog

All notable changes to GeoTagIt will be documented in this file.

## v1.0.0 - Initial Release

### New Features
- **Multi-Select Mode**: Dedicated checkbox button to enable/disable multi-select
- **Smart Selection**: Click photos to toggle selection without deselecting others
- **Selection Counter**: Shows "X selected" in header when photos are selected
- **Select All/Clear All**: Quick buttons for batch selection operations
- **Photo Grouping**: Group photos by folder with sticky headers
- **Visual Selection Indicators**: Cyan borders and check icons for selected photos
- **Circular Map Thumbnails**: Clean circular photo thumbnails in World View
- **Improved UI Controls**: Separate multi-select toggle from filter buttons

### UI Improvements
- **Clean Selection Design**: Border-only selection without cluttered checkboxes
- **Better Visual Hierarchy**: Clear separation between different control types
- **Smart Icon Positioning**: Prevents overlap between selection, geotag, and error indicators
- **Enhanced Hover States**: Better feedback for interactive elements
- **Responsive Layout**: Improved spacing and alignment

### Technical Improvements
- **Optimized Selection Logic**: Efficient multi-select state management
- **Memoized Grouping**: Performance-optimized photo grouping calculations
- **Better Error Handling**: Improved positioning of error indicators
- **Type Safety**: Enhanced TypeScript interfaces and prop types

### Bug Fixes
- **Fixed Duplicate Buttons**: Removed confusing duplicate grid icons
- **Improved Icon Semantics**: Proper icons for different functions (checkbox for multi-select, collection for grouping)
- **Better State Management**: Consistent selection behavior across different modes

---

## Previous Versions

### v0.0.0 - Development
- Initial development version
- Basic geotagging functionality
- Map integration with Leaflet
- File system integration with Tauri
- Basic photo management
