
import React from 'react';
import { WorldMapIcon, LocationMarkerFilledIcon } from './Icons';

interface MapTaggerProps {
  onMapClick: (x: number, y: number) => void;
  pin: { x: number; y: number } | null;
}

const MapTagger: React.FC<MapTaggerProps> = ({ onMapClick, pin }) => {
  const handleMapInteraction = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    onMapClick(x, y);
  };

  return (
    <div className="flex-1 bg-slate-800 rounded-lg relative overflow-hidden cursor-pointer" onClick={handleMapInteraction}>
        <WorldMapIcon className="w-full h-full object-cover text-slate-600" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent"></div>
        {pin && (
            <LocationMarkerFilledIcon 
                className="w-6 h-6 text-red-500 absolute drop-shadow-lg"
                style={{
                    left: `calc(${pin.x * 100}% - 12px)`,
                    top: `calc(${pin.y * 100}% - 24px)`,
                }}
            />
        )}
        <div className="absolute bottom-2 left-3 right-3 text-center text-xs text-slate-400 bg-black/30 p-1 rounded">Click to set location</div>
    </div>
  );
};

export default MapTagger;
