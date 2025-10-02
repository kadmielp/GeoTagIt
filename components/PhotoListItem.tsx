
import React from 'react';
import { Photo } from '../types';
import { LocationMarkerIcon, TrashIcon, ExclamationCircleIcon, CheckIcon } from './Icons';

interface PhotoListItemProps {
  photo: Photo;
  isSelected: boolean;
  onSelect: (id: string, isCtrlOrCmdKey: boolean) => void;
  onDelete: (id: string) => void;
  isMultiSelectMode?: boolean;
}

const PhotoListItem: React.FC<PhotoListItemProps> = ({ photo, isSelected, onSelect, onDelete, isMultiSelectMode = false }) => {
  
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    onSelect(photo.id, e.metaKey || e.ctrlKey);
  };

  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // prevent selection when deleting
    onDelete(photo.id);
  };

  const ringClass = () => {
    if (photo.error) {
      return 'ring-2 ring-red-500';
    }
    if (isSelected) {
      return 'ring-2 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-900 ring-cyan-500';
    }
    if (isMultiSelectMode) {
      return 'ring-1 ring-zinc-200 dark:ring-zinc-700/50 hover:ring-cyan-400 hover:ring-2';
    }
    return 'ring-1 ring-zinc-200 dark:ring-zinc-700/50 hover:ring-cyan-400';
  };

  return (
    <div
      onClick={handleClick}
      className={`relative aspect-square rounded-lg cursor-pointer transition-all duration-200 group overflow-hidden ${ringClass()}`}
      role="button"
      aria-pressed={isSelected}
      aria-label={`Select photo ${photo.name}`}
      title={photo.error ? `Error: ${photo.error}` : photo.name}
    >
      <img
        src={photo.dataUrl}
        alt={photo.name}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Selection indicator for multi-select mode */}
      {isMultiSelectMode && isSelected && (
        <div className="absolute top-1.5 left-1.5 bg-cyan-500 p-1 rounded-full">
          <CheckIcon className="w-3 h-3 text-white" />
        </div>
      )}
      
      {photo.geotag && !photo.error && (
        <div className="absolute top-1.5 right-1.5 bg-black/50 p-1 rounded-full">
            <LocationMarkerIcon className="w-3 h-3 text-white" />
        </div>
      )}

      {photo.error && (
        <div className={`absolute top-1.5 ${isMultiSelectMode && isSelected ? 'left-8' : 'left-1.5'} bg-red-500/80 p-1 rounded-full`}>
            <ExclamationCircleIcon className="w-3 h-3 text-white" />
        </div>
      )}

      <button
        onClick={handleDelete}
        title="Remove photo"
        className="absolute bottom-1.5 right-1.5 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"
        aria-label={`Remove photo ${photo.name}`}
      >
        <TrashIcon className="w-3.5 h-3.5 text-white" />
      </button>

       <p className="absolute bottom-1.5 left-1.5 right-8 text-xs text-white truncate px-1 opacity-0 group-hover:opacity-100 transition-opacity" title={photo.name}>
          {photo.name}
       </p>
    </div>
  );
};

export default PhotoListItem;
