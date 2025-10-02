import React, { useEffect, useRef } from 'react';
import { Photo } from '../types';
// Import Leaflet and the marker cluster plugin to ensure APIs are available
import * as L from 'leaflet';
import 'leaflet.markercluster';

interface WorldViewProps {
  photos: Photo[];
}

const WorldView: React.FC<WorldViewProps> = ({ photos }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerClusterGroupRef = useRef<any>(null);

  // Initialize map and cluster group
  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
        // Fix default Leaflet marker icons for production builds
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: '/images/marker-icon-2x.png',
            iconUrl: '/images/marker-icon.png',
            shadowUrl: '/images/marker-shadow.png',
        });

        mapInstanceRef.current = L.map(mapRef.current, {
            zoomControl: false
        }).setView([20, 0], 2);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapInstanceRef.current);

        L.control.zoom({ position: 'topright' }).addTo(mapInstanceRef.current);
        
        // Initialize marker cluster group and add it to the map
        markerClusterGroupRef.current = L.markerClusterGroup();
        mapInstanceRef.current.addLayer(markerClusterGroupRef.current);
    }
    // Invalidate size to ensure map renders correctly when view is switched
    setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100);

    // Cleanup on unmount to prevent leaks and stale handlers
    return () => {
      try {
        if (markerClusterGroupRef.current && mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(markerClusterGroupRef.current);
          markerClusterGroupRef.current = null;
        }
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      } catch {
        // no-op safe cleanup
      }
    };
  }, []);

  // Update markers when photos change
  useEffect(() => {
    if (!mapInstanceRef.current || !markerClusterGroupRef.current) return;

    // Clear existing markers from the cluster group
    markerClusterGroupRef.current.clearLayers();
    
    const geotaggedPhotos = photos.filter(p => p.geotag);
    const markers: any[] = [];

    geotaggedPhotos.forEach(photo => {
      if (!photo.geotag) return;

      const { lat, lng } = photo.geotag;

      const icon = L.divIcon({
          html: `<img src="${photo.dataUrl}" alt="${photo.name}" class="w-full h-full object-cover rounded-full shadow-lg" />`,
          className: 'photo-marker w-12 h-12 rounded-full border-2 border-cyan-500 dark:border-cyan-400 bg-zinc-100 dark:bg-zinc-800 p-0 transform hover:scale-110 transition-transform duration-200 cursor-pointer overflow-hidden',
          iconSize: [48, 48],
          iconAnchor: [24, 24],
      });
      
      const marker = L.marker([lat, lng], { icon });

      const popupContent = `
        <div class="p-0 m-0 bg-transparent">
          <img src="${photo.dataUrl}" alt="${photo.name}" class="w-64 h-auto rounded-t-lg mb-2" />
          <p class="text-sm text-zinc-800 dark:text-zinc-200 font-mono px-2 pb-2 truncate">${photo.name}</p>
        </div>
      `;

      marker.bindPopup(popupContent, {
          minWidth: 256
      });

      markers.push(marker);
    });
    
    // Add all markers to the cluster group
    markerClusterGroupRef.current.addLayers(markers);

    // Fit map to markers if there are any
    if (markers.length > 0) {
        // Use the bounds of the cluster group to fit the map
        mapInstanceRef.current.fitBounds(markerClusterGroupRef.current.getBounds().pad(0.2));
    } else {
        // If no photos, reset to world view
        mapInstanceRef.current.setView([20, 0], 2);
    }

  }, [photos]);

  return (
    <main className="flex-1 w-full h-full relative">
      <div ref={mapRef} className="w-full h-full z-0"></div>
    </main>
  );
};

export default WorldView;
