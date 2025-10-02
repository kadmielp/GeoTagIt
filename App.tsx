import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/tauri';
import { readBinaryFile } from '@tauri-apps/api/fs';
import { dialog } from '@tauri-apps/api';
import { appWindow } from '@tauri-apps/api/window';
import { UnlistenFn } from '@tauri-apps/api/event';

// Check if we're running in Tauri environment (robust)
const isTauri = ((): boolean => {
  try {
    if (typeof window !== 'undefined' && (window as any).__TAURI__) return true;
    if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.includes('Tauri')) return true;
  } catch {}
  return false;
})();
console.log('Tauri environment detected:', isTauri);
console.log('convertFileSrc available:', typeof convertFileSrc);
console.log('invoke available:', typeof invoke);
import { Photo, Geotag } from './types';
import Header from './components/Header';
import PhotoListItem from './components/PhotoListItem';
import GeotaggerPanel from './components/GeotaggerPanel';
import StatusBar from './components/StatusBar';
import SettingsModal from './components/SettingsModal';
import WorldView from './components/WorldView';
import { LocationMarkerIcon, CheckCircleIcon, ViewGridIcon, LocationMarkerOffIcon, PlusIcon, CollectionIcon, CheckIcon, Squares2X2Icon } from './components/Icons';
import PhotoUploader from './components/PhotoUploader';
import { writeGeotagToImage, downloadImageWithGeotag } from './utils/exifWriter';

export type Theme = 'light' | 'dark';
export type View = 'editor' | 'world';
export type FilterMode = 'all' | 'geotagged' | 'untagged';
type GroupingMode = 'none' | 'folder';

const App: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [view, setView] = useState<View>('editor');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('none');
  const [isGroupingMenuOpen, setIsGroupingMenuOpen] = useState<boolean>(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (toastMessage) {
        const timer = setTimeout(() => {
            setToastMessage(null);
        }, 3000);
        return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleThemeToggle = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  const handleFilesSelected = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) {
      setToastMessage("No files selected");
      return;
    }

    console.log("Processing", files.length, "files...");
    setToastMessage(`Processing ${files.length} files...`);

    try {
      const newPhotosPromises = Array.from(files).map(async (file: File): Promise<Photo> => {
        const name = file.name;
        console.log("Processing file:", name);
        
        // Handle data URL creation based on environment
        let dataUrl: string;
        if (isTauri && typeof convertFileSrc === 'function' && (file as any).path) {
          // Tauri environment with file path
          try {
            dataUrl = convertFileSrc((file as any).path);
            console.log("Data URL created from path:", dataUrl);
          } catch (err) {
            console.error("Error calling convertFileSrc:", err);
            // Fallback: read bytes via Tauri fs, create blob URL
            try {
              const bytes = await readBinaryFile((file as any).path);
              const ext = (name.split('.').pop() || '').toLowerCase();
              const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                : ext === 'tif' || ext === 'tiff' ? 'image/tiff'
                : ext === 'png' ? 'image/png'
                : ext === 'gif' ? 'image/gif'
                : ext === 'bmp' ? 'image/bmp'
                : ext === 'webp' ? 'image/webp'
                : 'application/octet-stream';
              const blob = new Blob([new Uint8Array(bytes)], { type: mime });
              dataUrl = URL.createObjectURL(blob);
            } catch (err2) {
              console.error("Fallback readBinaryFile failed:", err2);
              // Last resort: object URL from empty File (may fail to render)
              dataUrl = URL.createObjectURL(file);
            }
          }
        } else {
          // Browser environment - create object URL
          dataUrl = URL.createObjectURL(file);
          console.log("Data URL created from object:", dataUrl);
        }
        
        let geotag: Geotag | null = null;
        if (isTauri && typeof invoke === 'function' && (file as any).path) {
          try {
            geotag = await invoke<Geotag | null>('read_geotag', { path: (file as any).path });
          } catch (err) {
            console.error("Error reading geotag:", err);
            geotag = null;
          }
        } else {
          console.warn("invoke not available, skipping geotag reading");
        }
        
        return { 
          id: crypto.randomUUID(), 
          path: (file as any).path || file.name, 
          name, 
          dataUrl, 
          geotag 
        };
      });

      const newPhotos = await Promise.all(newPhotosPromises);
      setPhotos(prev => [...prev, ...newPhotos]);
      if (newPhotos.length > 0) {
        setSelectedPhotoIds([newPhotos[newPhotos.length - 1].id]);
      }
      console.log("Successfully added", newPhotos.length, "photos");
      setToastMessage(`Successfully added ${newPhotos.length} photos`);
    } catch (err) {
      console.error("Error processing files:", err);
      setToastMessage(`Error processing files: ${err}`);
    }
  }, []);

  const handleOpenFileDialog = useCallback(async () => {
    try {
      // Prefer native dialog if available; if it throws, fall back
      const selected = await dialog.open({
        multiple: true,
        filters: [{ name: 'Images (JPEG/TIFF best for EXIF writing)', extensions: ['jpg', 'jpeg', 'tif', 'tiff', 'png', 'gif', 'bmp', 'webp'] }],
        directory: false,
      });
      
      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        console.log("Selected paths:", paths);
        const fileList = await createFileList(paths);
        handleFilesSelected(fileList);
      }
    } catch (err) {
      console.warn("Tauri dialog failed, falling back to file input:", err);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.click();
      } else {
        setToastMessage("File dialog not available in this environment");
      }
    }
  }, [handleFilesSelected]);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    const listen = async () => {
      // Check if appWindow is available (Tauri context)
      if (!isTauri || typeof appWindow?.onFileDropEvent !== 'function') {
        console.warn("Tauri appWindow not available, file drop events disabled");
        return;
      }

      try {
        unlisten = await appWindow.onFileDropEvent(async (event) => {
          if (event.payload.type === 'drop') {
            const fileList = await createFileList(event.payload.paths);
            handleFilesSelected(fileList);
          }
        });
      } catch (err) {
        console.error("Error setting up file drop listener:", err);
      }
    }

    listen();

    return () => {
      if (unlisten) {
        unlisten();
      }
    }
  }, [handleFilesSelected]);

  async function createFileList(paths: string[]): Promise<FileList> {
    const files = paths.map((path) => {
      const fileName = path.split(/[\\/]/).pop() || path;
      // Infer mime type by extension to improve downstream behavior
      const ext = (fileName.split('.').pop() || '').toLowerCase();
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
        : ext === 'tif' || ext === 'tiff' ? 'image/tiff'
        : ext === 'png' ? 'image/png'
        : ext === 'gif' ? 'image/gif'
        : ext === 'bmp' ? 'image/bmp'
        : ext === 'webp' ? 'image/webp'
        : 'application/octet-stream';
      const file = new File([], fileName, { type: mime });
      Object.defineProperty(file, 'path', { value: path });
      return file;
    });
  
    const dt = new DataTransfer();
    files.forEach(file => dt.items.add(file));
    return dt.files;
  }

  const handleSelectPhoto = useCallback((id: string, isCtrlOrCmdKey: boolean) => {
    setSelectedPhotoIds(prevIds => {
      if (isCtrlOrCmdKey) {
        const isSelected = prevIds.includes(id);
        if (isSelected) {
          return prevIds.filter(prevId => prevId !== id);
        } else {
          return [...prevIds, id];
        }
      } else {
        return [id];
      }
    });
  }, []);

  const selectedPhotos = useMemo(() => {
    return selectedPhotoIds.map(id => photos.find(p => p.id === id)).filter((p): p is Photo => p !== undefined);
  }, [photos, selectedPhotoIds]);

  const handleApplyGeotag = useCallback(async (geotag: Geotag) => {
    // Helper to parse structured Rust errors
    const getErrorMessage = (error: any): string => {
        console.log('Raw error:', JSON.stringify(error, null, 2));
        let err = error;
        // Tauri can sometimes wrap the error in a string, so we try to parse it.
        if (typeof err === 'string') {
            try { err = JSON.parse(err); } catch {}
        }

        if (typeof err === 'object' && err !== null) {
            if ('UnsupportedFileType' in err) {
                return "Unsupported file type. Only JPEG/TIFF are supported.";
            } else if (err.MetadataParse) {
                return `Failed to parse metadata: ${err.MetadataParse}`;
            } else if (err.MetadataWrite) {
                return `Failed to write metadata: ${err.MetadataWrite}`;
            } else if (err.Io) {
                return `File error: ${err.Io}`;
            }
        }
        // Fallback for unexpected error structures
        return typeof error === 'string' ? error : JSON.stringify(error);
    };

    // Clear previous errors for selected photos before trying again
    setPhotos(prev => prev.map(p => selectedPhotoIds.includes(p.id) ? { ...p, error: undefined } : p));

    if (isTauri && typeof invoke === 'function') {
        const withPath = selectedPhotos.filter(p => p.path && (/^[a-zA-Z]:\\/.test(p.path) || p.path.startsWith('/')));
        const withoutPath = selectedPhotos.filter(p => !p.path || !(/^[a-zA-Z]:\\/.test(p.path) || p.path.startsWith('/')));

        const results = await Promise.allSettled(
            withPath.map(photo => invoke('write_geotag', { path: photo.path, geotag }).then(() => photo.id))
        );

        const successes: string[] = [];
        const failures: { id: string; reason: string }[] = [];

        results.forEach((res, idx) => {
            const photo = withPath[idx];
            if (res.status === 'fulfilled') {
                successes.push(photo.id);
            } else {
                const reason = getErrorMessage(res.reason);
                console.error(`Failed to write geotag for ${photo.name}:`, res.reason);
                failures.push({ id: photo.id, reason });
            }
        });
        
        let inMemoryUpdated: { id: string; dataUrl: string; geotag: Geotag }[] = [];
        if (withoutPath.length > 0) {
            try {
                const updated = await Promise.all(
                    withoutPath.map(async (photo) => {
                        const response = await fetch(photo.dataUrl);
                        const blob = await response.blob();
                        const modifiedBlob = await writeGeotagToImage(blob, geotag);
                        const newDataUrl = URL.createObjectURL(modifiedBlob);
                        if (photo.dataUrl.startsWith('blob:')) URL.revokeObjectURL(photo.dataUrl);
                        return { id: photo.id, dataUrl: newDataUrl, geotag };
                    })
                );
                inMemoryUpdated = updated;
            } catch (e) {
                console.error('In-memory EXIF write failed:', e);
                withoutPath.forEach(p => failures.push({ id: p.id, reason: 'In-memory EXIF write failed.' }));
            }
        }

        setPhotos(prevPhotos =>
            prevPhotos.map(photo => {
                if (successes.includes(photo.id)) {
                    return { ...photo, geotag: geotag, error: undefined };
                }
                const memUpdate = inMemoryUpdated.find(u => u.id === photo.id);
                if (memUpdate) {
                    return { ...photo, ...memUpdate, error: undefined };
                }
                const failure = failures.find(f => f.id === photo.id);
                if (failure) {
                    return { ...photo, error: failure.reason };
                }
                return photo;
            })
        );

        if (failures.length > 0 && successes.length > 0) {
            setToastMessage(`Geotagged ${successes.length} photo(s), but ${failures.length} failed.`);
        } else if (failures.length > 0) {
            setToastMessage(`Failed to apply geotag to ${failures.length} photo(s).`);
        } else {
            setToastMessage(`Geotags applied successfully to ${successes.length + inMemoryUpdated.length} photo(s).`);
        }

    } else {
      // Browser environment logic remains largely the same
      try {
        const updatePromises = selectedPhotos.map(async (photo) => {
          const response = await fetch(photo.dataUrl);
          const blob = await response.blob();
          const modifiedBlob = await writeGeotagToImage(blob, geotag);
          const newDataUrl = URL.createObjectURL(modifiedBlob);
          if (photo.dataUrl.startsWith('blob:')) {
            URL.revokeObjectURL(photo.dataUrl);
          }
          return { ...photo, dataUrl: newDataUrl, geotag, error: undefined };
        });
        const updatedPhotos = await Promise.all(updatePromises);
        setPhotos(prevPhotos =>
          prevPhotos.map(p => updatedPhotos.find(up => up.id === p.id) || p)
        );
        setToastMessage('Geotags embedded in images successfully.');
      } catch (error) {
        console.error('Error writing geotag to image:', error);
        setToastMessage('Error applying geotags to images.');
        setPhotos(prev => prev.map(p => selectedPhotoIds.includes(p.id) ? { ...p, error: String(error) } : p));
      }
    }
  }, [selectedPhotos, selectedPhotoIds]);

  const handleClearGeotag = useCallback(async () => {
    if (isTauri && typeof invoke === 'function') {
      // Tauri environment - clear directly from files
      const clearPromises = selectedPhotos.map(photo =>
        invoke('clear_geotag', { path: photo.path }).catch(e =>
          console.error(`Failed to clear geotag for ${photo.name}:`, e)
        )
      );
      await Promise.all(clearPromises);
    } else {
      // Browser environment - for now just update UI state
      // Full implementation would require EXIF removal functionality
      console.warn('Browser geotag clearing - removing from UI state only');
    }

    setPhotos(prevPhotos =>
      prevPhotos.map(photo =>
        selectedPhotoIds.includes(photo.id) ? { ...photo, geotag: null } : photo
      )
    );
    setToastMessage('Geotags cleared successfully.');
  }, [selectedPhotos, selectedPhotoIds]);

  const handleDeletePhoto = useCallback((idToDelete: string) => {
    setPhotos(prevPhotos => prevPhotos.filter(p => p.id !== idToDelete));
    setSelectedPhotoIds(prevIds => prevIds.filter(id => id !== idToDelete));
  }, []);

  const handleDownloadGeotagged = useCallback(async () => {
    if (!isTauri) {
      // Browser environment - download photos with embedded geotags
      try {
        const geotaggedPhotos = selectedPhotos.filter(photo => photo.geotag);
        if (geotaggedPhotos.length === 0) {
          setToastMessage('No geotagged photos to download.');
          return;
        }

        setToastMessage(`Downloading ${geotaggedPhotos.length} geotagged photos...`);

        for (const photo of geotaggedPhotos) {
          if (photo.geotag) {
            await downloadImageWithGeotag(photo, photo.geotag);
          }
        }

        setToastMessage(`Successfully downloaded ${geotaggedPhotos.length} geotagged photos.`);
      } catch (error) {
        console.error('Error downloading geotagged photos:', error);
        setToastMessage('Error downloading geotagged photos.');
      }
    } else {
      setToastMessage('Download feature is for browser mode only. In Tauri, geotags are written directly to files.');
    }
  }, [selectedPhotos, isTauri]);
  
  const activePhoto = useMemo(() => {
    if (selectedPhotoIds.length === 0) return null;
    const lastSelectedId = selectedPhotoIds[selectedPhotoIds.length - 1];
    return photos.find(p => p.id === lastSelectedId) || null;
  }, [photos, selectedPhotoIds]);

  const filteredPhotos = useMemo(() => {
    switch (filterMode) {
      case 'geotagged':
        return photos.filter(p => p.geotag);
      case 'untagged':
        return photos.filter(p => !p.geotag);
      case 'all':
      default:
        return photos;
    }
  }, [photos, filterMode]);

  // Group photos by selected mode (memoized)
  const groupedPhotos = useMemo(() => {
    if (groupingMode === 'none') {
      return { all_photos: filteredPhotos } as Record<string, Photo[]>;
    }

    // Group by folder based on `path`. If no folder, bucket as Manually Added
    const groups: Record<string, Photo[]> = {};
    filteredPhotos.forEach((photo) => {
      const path = photo.path || '';
      // Try to extract folder from absolute or relative path
      const normalized = path.replace(/\\/g, '/');
      const lastSlash = normalized.lastIndexOf('/');
      const folder = lastSlash > 0 ? normalized.substring(0, lastSlash) : '';
      const key = folder ? folder : 'Manually Added';
      if (!groups[key]) groups[key] = [];
      groups[key].push(photo);
    });
    return groups;
  }, [filteredPhotos, groupingMode]);

  // Close grouping menu on outside click
  useEffect(() => {
    if (!isGroupingMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Close if clicking outside any element with data-grouping-menu
      if (!target.closest('[data-grouping-menu]')) {
        setIsGroupingMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [isGroupingMenuOpen]);

  return (
    <div className="flex flex-col h-screen antialiased">
      <Header 
        theme={theme} 
        onThemeToggle={handleThemeToggle} 
        onSettingsClick={() => setIsSettingsOpen(true)}
        onAddPhotosClick={handleOpenFileDialog}
        view={view}
        onViewChange={setView}
      />
      <div className="flex flex-1 min-h-0">
        {view === 'editor' ? (
          <>
            <aside className="w-[28rem] bg-zinc-50 dark:bg-zinc-900/70 p-4 flex flex-col flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                   <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Photos</h2>
                   {isMultiSelectMode && (
                     <div className="flex items-center space-x-2">
                       {selectedPhotoIds.length > 0 && (
                         <span className="text-xs text-cyan-500 dark:text-cyan-400 font-medium">
                           {selectedPhotoIds.length} selected
                         </span>
                       )}
                       <button
                         onClick={() => {
                           if (selectedPhotoIds.length === filteredPhotos.length) {
                             setSelectedPhotoIds([]);
                           } else {
                             setSelectedPhotoIds(filteredPhotos.map(p => p.id));
                           }
                         }}
                         className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors"
                       >
                         {selectedPhotoIds.length === filteredPhotos.length ? 'Clear All' : 'Select All'}
                       </button>
                     </div>
                   )}
                   <button
                     onClick={handleOpenFileDialog}
                     title="Add photos"
                     aria-label="Add photos"
                     className="ml-1 p-1 rounded-md bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
                   >
                     <PlusIcon className="w-4 h-4 text-zinc-700 dark:text-zinc-200" />
                   </button>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 bg-zinc-200 dark:bg-zinc-800 p-1 rounded-lg">
                    {/* Multi-select toggle */}
                    <button 
                      onClick={() => setIsMultiSelectMode(!isMultiSelectMode)} 
                      title={isMultiSelectMode ? "Exit Multi-Select Mode" : "Enter Multi-Select Mode"}
                      className={`p-1 rounded-md transition-colors ${isMultiSelectMode ? 'bg-white dark:bg-zinc-700' : 'hover:bg-zinc-300 dark:hover:bg-zinc-700/50'}`}
                    >
                      <Squares2X2Icon className={`w-4 h-4 ${isMultiSelectMode ? 'text-cyan-500' : 'text-zinc-500 dark:text-zinc-400'}`} />
                    </button>

                    {/* Filter Buttons */}
                    <button onClick={() => setFilterMode('all')} title="Show All Photos" className={`p-1 rounded-md transition-colors ${filterMode === 'all' ? 'bg-white dark:bg-zinc-700' : 'hover:bg-zinc-300 dark:hover:bg-zinc-700/50'}`}>
                        <ViewGridIcon className={`w-4 h-4 ${filterMode === 'all' ? 'text-cyan-500' : 'text-zinc-500 dark:text-zinc-400'}`} />
                    </button>
                    <button onClick={() => setFilterMode('geotagged')} title="Show Geotagged Photos" className={`p-1 rounded-md transition-colors ${filterMode === 'geotagged' ? 'bg-white dark:bg-zinc-700' : 'hover:bg-zinc-300 dark:hover:bg-zinc-700/50'}`}>
                        <LocationMarkerIcon className={`w-4 h-4 ${filterMode === 'geotagged' ? 'text-cyan-500' : 'text-zinc-500 dark:text-zinc-400'}`} />
                    </button>
                    <button onClick={() => setFilterMode('untagged')} title="Show Untagged Photos" className={`p-1 rounded-md transition-colors ${filterMode === 'untagged' ? 'bg-white dark:bg-zinc-700' : 'hover:bg-zinc-300 dark:hover:bg-zinc-700/50'}`}>
                        <LocationMarkerOffIcon className={`w-4 h-4 ${filterMode === 'untagged' ? 'text-cyan-500' : 'text-zinc-500 dark:text-zinc-400'}`} />
                    </button>
                  </div>

                  {/* Grouping popover at the far right */}
                  <div className="relative" data-grouping-menu>
                    <button
                      onClick={() => setIsGroupingMenuOpen(v => !v)}
                      title="Group by"
                      className={`p-1 rounded-md transition-colors ${isGroupingMenuOpen ? 'bg-white dark:bg-zinc-700' : 'bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700/50'}`}
                    >
                      <CollectionIcon className={`w-4 h-4 ${isGroupingMenuOpen ? 'text-cyan-500' : 'text-zinc-500 dark:text-zinc-400'}`} />
                    </button>

                    {isGroupingMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-2xl border border-zinc-200/50 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-800/90 backdrop-blur z-20">
                        <div className="px-3 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Group By</div>
                        <button
                          onClick={() => { setGroupingMode('none'); setIsGroupingMenuOpen(false); }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60 ${groupingMode === 'none' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'}`}
                        >
                          <span>No Grouping</span>
                          {groupingMode === 'none' && <CheckIcon className="w-4 h-4 text-cyan-500" />}
                        </button>
                        <button
                          onClick={() => { setGroupingMode('folder'); setIsGroupingMenuOpen(false); }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60 ${groupingMode === 'folder' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'}`}
                        >
                          <span>Folder</span>
                          {groupingMode === 'folder' && <CheckIcon className="w-4 h-4 text-cyan-500" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto pr-1">
                {filteredPhotos.length > 0 ? (
                  groupingMode === 'none' ? (
                    <div className="grid grid-cols-4 gap-3">
                      {filteredPhotos.map(photo => (
                        <PhotoListItem
                          key={photo.id}
                          photo={photo}
                          isSelected={selectedPhotoIds.includes(photo.id)}
                          onSelect={handleSelectPhoto}
                          onDelete={handleDeletePhoto}
                          isMultiSelectMode={isMultiSelectMode}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(groupedPhotos).map(([groupName, group]) => (
                        <section key={groupName}>
                          <div className="sticky top-0 z-10 -mx-1 px-1 py-1 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/60 supports-[backdrop-filter]:dark:bg-zinc-900/60 bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200/60 dark:border-zinc-800/60">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate" title={groupName}>{groupName}</h3>
                          </div>
                          <div className="mt-3 grid grid-cols-4 gap-3">
                            {group.map((photo) => (
                              <PhotoListItem
                                key={photo.id}
                                photo={photo}
                                isSelected={selectedPhotoIds.includes(photo.id)}
                                onSelect={handleSelectPhoto}
                                onDelete={handleDeletePhoto}
                                isMultiSelectMode={isMultiSelectMode}
                              />
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <PhotoUploader onFilesSelected={handleFilesSelected} onOpenNativeDialog={handleOpenFileDialog} />
                  </div>
                )}
              </div>
            </aside>

            <main className="flex-1 flex items-center justify-center p-6 bg-zinc-100 dark:bg-zinc-800/50 relative">
              {activePhoto ? (
                  <>
                    <img
                        src={activePhoto.dataUrl}
                        alt={activePhoto.name}
                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                    />
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-auto max-w-md bg-white/70 dark:bg-zinc-900/70 backdrop-blur-lg rounded-xl p-4 flex items-center justify-between shadow-lg">
                        <p className="text-sm font-mono truncate mr-4" title={activePhoto.name}>
                          {selectedPhotos.length > 1 ? `${selectedPhotos.length} photos selected` : activePhoto.name}
                        </p>
                        <div className="flex items-center space-x-2 text-cyan-600 dark:text-cyan-400 flex-shrink-0">
                            <LocationMarkerIcon className="w-5 h-5"/>
                            <span className="font-mono text-sm">
                                {activePhoto.geotag ? `${activePhoto.geotag.lat.toFixed(4)}, ${activePhoto.geotag.lng.toFixed(4)}` : 'No Geotag'}
                            </span>
                        </div>
                    </div>
                  </>
              ) : (
                <div className="text-center">
                    <LocationMarkerIcon className="w-16 h-16 text-zinc-400 dark:text-zinc-600 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-zinc-700 dark:text-zinc-300">No Photo Selected</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">Add photos and select one to see a preview.</p>
                </div>
              )}
            </main>
            <GeotaggerPanel selectedPhotos={selectedPhotos} onApplyGeotag={handleApplyGeotag} onClearGeotag={handleClearGeotag} onDownloadGeotagged={!isTauri ? handleDownloadGeotagged : undefined} />
          </>
        ) : (
          <WorldView photos={photos} />
        )}
      </div>
      <StatusBar photoCount={photos.length} selectionCount={selectedPhotos.length} />
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
      />
      {toastMessage && (
        <div className="absolute bottom-10 right-10 bg-emerald-600 text-white text-sm font-medium py-3 px-5 rounded-xl shadow-2xl flex items-center space-x-3 z-50">
          <CheckCircleIcon className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
