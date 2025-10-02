import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Photo, Geotag } from '../types';
import { SearchIcon, TrashIcon, DownloadIcon } from './Icons';

// Declare Leaflet to TypeScript
import * as L from 'leaflet';

interface GeotaggerPanelProps {
  selectedPhotos: Photo[];
  onApplyGeotag: (geotag: Geotag) => void;
  onClearGeotag: () => void;
  onDownloadGeotagged?: () => void;
}

// Simplified type for Nominatim search results
interface NominatimResult {
    place_id: number;
    lat: string;
    lon: string;
    display_name: string;
}

const GeotaggerPanel: React.FC<GeotaggerPanelProps> = ({ selectedPhotos, onApplyGeotag, onClearGeotag, onDownloadGeotagged }) => {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const isDirectMapInteraction = useRef(false);
  const preventZoomOnApplyRef = useRef(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
        // Fix default Leaflet marker icons for production builds
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: '/images/marker-icon-2x.png',
            iconUrl: '/images/marker-icon.png',
            shadowUrl: '', // Remove shadow
        });

        mapInstanceRef.current = L.map(mapRef.current, {
            zoomControl: false
        }).setView([20, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapInstanceRef.current);
        L.control.zoom({ position: 'topright' }).addTo(mapInstanceRef.current);

        mapInstanceRef.current.on('click', (e: any) => {
            isDirectMapInteraction.current = true;
            const { lat, lng } = e.latlng;
            setLat(lat.toFixed(4));
            setLng(lng.toFixed(4));
        });
    }
     // Invalidate size to ensure map renders correctly in a dynamic container
    setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100);
  }, []);

  useEffect(() => {
    if (selectedPhotos.length === 1 && selectedPhotos[0].geotag) {
      setLat(selectedPhotos[0].geotag.lat.toString());
      setLng(selectedPhotos[0].geotag.lng.toString());
    } else if (selectedPhotos.length > 1) {
      const firstGeotag = selectedPhotos[0]?.geotag;
      const allSame = selectedPhotos.every(p => 
        p.geotag?.lat === firstGeotag?.lat && p.geotag?.lng === firstGeotag?.lng
      );
      if (allSame && firstGeotag) {
        setLat(firstGeotag.lat.toString());
        setLng(firstGeotag.lng.toString());
      } else {
        setLat('');
        setLng('');
      }
    } else {
      setLat('');
      setLng('');
    }
    setError(null);
  }, [selectedPhotos]);
  
  useEffect(() => {
      if (!mapInstanceRef.current) return;

      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (!isNaN(latitude) && !isNaN(longitude)) {
          const latLng = L.latLng(latitude, longitude);
          
          if (isDirectMapInteraction.current || preventZoomOnApplyRef.current) {
            mapInstanceRef.current.panTo(latLng);
            isDirectMapInteraction.current = false; // Reset after interaction
            preventZoomOnApplyRef.current = false; // Reset after interaction
          } else {
            mapInstanceRef.current.setView(latLng, mapInstanceRef.current.getZoom() < 5 ? 13 : mapInstanceRef.current.getZoom());
          }

          if (!markerInstanceRef.current) {
              markerInstanceRef.current = L.marker(latLng, { draggable: true }).addTo(mapInstanceRef.current);
              
              markerInstanceRef.current.on('dragend', (e: any) => {
                const marker = e.target;
                const position = marker.getLatLng();
                isDirectMapInteraction.current = true;
                setLat(position.lat.toFixed(4));
                setLng(position.lng.toFixed(4));
              });


          } else {
              markerInstanceRef.current.setLatLng(latLng);
          }
      } else {
          if (markerInstanceRef.current) {
              mapInstanceRef.current.removeLayer(markerInstanceRef.current);
              markerInstanceRef.current = null;
          }
      }
  }, [lat, lng]);

  // Debounced search effect
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      setError(null);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data: NominatimResult[] = await response.json();
        if (data.length === 0) {
            setError("No locations found for your search.");
        }
        setSearchResults(data);
      } catch (err) {
        console.error(err);
        setError("An error occurred during search. Please check your connection.");
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Effect to handle clicks outside of the search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
            setSearchResults([]);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (result: NominatimResult) => {
    setLat(parseFloat(result.lat).toFixed(4));
    setLng(parseFloat(result.lon).toFixed(4));
    setSearchQuery(''); // Clear search input
    setSearchResults([]); // Hide results
    setError(null);
  };
  
  const handleApply = () => {
      if(selectedPhotos.length > 0 && lat && lng) {
          const newGeotag: Geotag = {
              lat: parseFloat(lat),
              lng: parseFloat(lng),
          };
          preventZoomOnApplyRef.current = true;
          onApplyGeotag(newGeotag);
      }
  }

  const unsupported = useMemo(() => selectedPhotos.some(p => !p.path.toLowerCase().match(/\.(jpe?g|tiff?)$/)), [selectedPhotos]);
  const isApplyValid = selectedPhotos.length > 0 && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng)) && !unsupported;
  const canClearGeotag = useMemo(() => selectedPhotos.some(p => p.geotag), [selectedPhotos]);

  return (
    <aside className="w-96 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 p-4 flex flex-col space-y-4 flex-shrink-0">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Geotagger</h2>
        <div ref={searchContainerRef} className="relative">
            <form onSubmit={(e) => e.preventDefault()} className="relative">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for a location..."
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    aria-label="Search for a location"
                    autoComplete="off"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {isLoading ? <div className="w-4 h-4 border-2 border-t-transparent border-zinc-500 rounded-full animate-spin"></div> : <SearchIcon className="w-4 h-4 text-zinc-400"/>}
                </div>
            </form>
            {searchResults.length > 0 && (
                <ul className="absolute top-full mt-1 w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {searchResults.map((result) => (
                        <li key={result.place_id}>
                            <button
                                type="button"
                                onClick={() => handleSelectResult(result)}
                                className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                            >
                                {result.display_name}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
         {error && <p className="text-red-500 text-xs px-1 -mt-2">{error}</p>}
        <div className="flex-1 rounded-lg relative overflow-hidden shadow-inner min-h-[200px]">
            <div ref={mapRef} className="w-full h-full rounded-lg z-0 cursor-pointer"></div>
             <div className="absolute bottom-2 left-2 right-2 text-center text-xs text-zinc-800 dark:text-zinc-200 bg-white/60 dark:bg-zinc-900/60 p-1 rounded-md pointer-events-none backdrop-blur-sm">
                Click map or drag pin to set location
            </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
            <div>
                <label htmlFor="latitude" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Latitude</label>
                <input 
                    id="latitude"
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={e => setLat(e.target.value)}
                    placeholder={selectedPhotos.length > 1 ? "Multiple" : "e.g. 48.8584"}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
            </div>
            <div>
                <label htmlFor="longitude" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Longitude</label>
                <input 
                    id="longitude"
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={e => setLng(e.target.value)}
                    placeholder={selectedPhotos.length > 1 ? "Multiple" : "e.g. 2.2945"}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
            </div>
        </div>
        <div className="flex items-center space-x-2 pt-2">
            <button 
                onClick={handleApply}
                disabled={!isApplyValid}
                className="flex-grow w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-4 rounded-lg transition-all duration-200 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed disabled:text-zinc-500 dark:disabled:text-zinc-400 shadow-sm hover:shadow-md"
            >
                Apply Geotag to {selectedPhotos.length > 1 ? `${selectedPhotos.length} Photos` : 'Photo'}
            </button>
            {unsupported && (
              <div className="text-[11px] text-amber-600 dark:text-amber-400 ml-1 self-center" title="Writing EXIF works for JPEG/TIFF only.">
                JPEG/TIFF only for writing
              </div>
            )}
            {onDownloadGeotagged && (
                <button
                    onClick={onDownloadGeotagged}
                    disabled={selectedPhotos.length === 0 || selectedPhotos.every(p => !p.geotag)}
                    title="Download Geotagged Photos"
                    aria-label="Download geotagged photos"
                    className="flex-shrink-0 p-2.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-600 dark:hover:text-blue-400 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-400 dark:disabled:text-zinc-500 transition-all"
                >
                    <DownloadIcon className="w-5 h-5" />
                </button>
            )}
            <button
                onClick={onClearGeotag}
                disabled={!canClearGeotag}
                title="Clear Geotag"
                aria-label="Clear geotag from selected photos"
                className="flex-shrink-0 p-2.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-600 dark:hover:text-red-400 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-400 dark:disabled:text-zinc-500 transition-all"
            >
                <TrashIcon className="w-5 h-5" />
            </button>
        </div>
    </aside>
  );
};

export default GeotaggerPanel;