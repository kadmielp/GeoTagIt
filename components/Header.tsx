import React from 'react';
import { View } from '../App';
import { MapIcon, MoonIcon, SunIcon, SettingsIcon, GlobeAltIcon, PencilIcon } from './Icons';

interface HeaderProps {
    theme: 'light' | 'dark';
    onThemeToggle: () => void;
    onSettingsClick: () => void;
    onAddPhotosClick: () => void;
    view: View;
    onViewChange: (view: View) => void;
}

const Header: React.FC<HeaderProps> = ({ theme, onThemeToggle, onSettingsClick, onAddPhotosClick, view, onViewChange }) => {
  return (
    <header data-tauri-drag-region className="bg-white dark:bg-zinc-900 h-14 flex items-center justify-between pl-4 pr-36 flex-shrink-0 select-none border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <MapIcon className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />
          <span className="font-semibold text-lg text-zinc-800 dark:text-zinc-100">GeoTagIt</span>
        </div>
         <div className="flex space-x-1 rounded-lg bg-zinc-200 dark:bg-zinc-900/50 p-1">
          <button 
            onClick={() => onViewChange('editor')}
            title="Editor View"
            className={`flex items-center space-x-2 px-3 py-1 text-sm rounded-md transition-colors ${view === 'editor' ? 'bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 shadow' : 'text-zinc-600 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-700/50'}`}
          >
            <PencilIcon className="w-4 h-4" />
            <span>Editor</span>
          </button>
          <button 
            onClick={() => onViewChange('world')}
            title="World View"
            className={`flex items-center space-x-2 px-3 py-1 text-sm rounded-md transition-colors ${view === 'world' ? 'bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 shadow' : 'text-zinc-600 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-700/50'}`}
          >
            <GlobeAltIcon className="w-4 h-4" />
            <span>World View</span>
          </button>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button onClick={onSettingsClick} title="Settings" className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <SettingsIcon className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
        </button>
        <button onClick={onThemeToggle} title="Toggle theme" className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            {theme === 'dark' ? <SunIcon className="w-6 h-6 text-zinc-400" /> : <MoonIcon className="w-6 h-6 text-zinc-500" />}
        </button>
      </div>
    </header>
  );
};

export default Header;