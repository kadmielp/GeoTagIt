
import React from 'react';
import { Theme } from '../App';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, theme, onThemeChange
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div 
        className="bg-zinc-100 dark:bg-zinc-800 rounded-xl shadow-2xl w-full max-w-md m-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-700">
          <h2 id="settings-title" className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            Settings
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Appearance Section */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-3 uppercase tracking-wider">Appearance</h3>
            <div className="space-y-2">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">Theme</p>
              <div className="flex space-x-2 rounded-lg bg-zinc-200 dark:bg-zinc-900/50 p-1">
                <button 
                  onClick={() => onThemeChange('light')}
                  className={`w-full py-1.5 text-sm rounded-md transition-colors ${theme === 'light' ? 'bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 shadow' : 'text-zinc-600 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-700/50'}`}
                >
                  Light
                </button>
                <button 
                  onClick={() => onThemeChange('dark')}
                  className={`w-full py-1.5 text-sm rounded-md transition-colors ${theme === 'dark' ? 'bg-zinc-700 text-zinc-100 shadow' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-700/50'}`}
                >
                  Dark
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-zinc-200/50 dark:bg-zinc-800/50 text-right rounded-b-xl">
          <button 
            onClick={onClose}
            className="px-6 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
