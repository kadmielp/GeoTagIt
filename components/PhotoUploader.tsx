
import React, { useRef, useState } from 'react';
import { UploadIcon } from './Icons';

interface PhotoUploaderProps {
  onFilesSelected: (files: FileList | null) => void;
  // If provided, this will be used to open the native dialog (Tauri)
  onOpenNativeDialog?: () => void;
}

const PhotoUploader: React.FC<PhotoUploaderProps> = ({ onFilesSelected, onOpenNativeDialog }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilesSelected(e.target.files);
  };

  const openFileDialog = () => {
    if (onOpenNativeDialog) {
      // Prefer native dialog in desktop (ensures real filesystem paths)
      onOpenNativeDialog();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8 w-full">
      <div
        className={`w-full max-w-2xl h-80 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors duration-300 ${isDragging ? 'border-cyan-400 bg-slate-800/70' : 'border-slate-600 bg-slate-800/50'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadIcon className="w-16 h-16 text-slate-500 mb-4" />
        <p className="text-slate-400 mb-2">Drag & drop your photos here</p>
        <p className="text-slate-500 text-sm mb-4">or</p>
        <input
          type="file"
          multiple
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={openFileDialog}
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-md transition-colors"
        >
          Select Photos
        </button>
      </div>
    </div>
  );
};

export default PhotoUploader;
