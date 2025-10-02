import React from 'react';

interface StatusBarProps {
  photoCount: number;
  selectionCount: number;
}

const StatusBar: React.FC<StatusBarProps> = ({ photoCount, selectionCount }) => {
  const getSelectionText = () => {
    if (selectionCount === 0) {
      return 'Ready';
    }
    if (selectionCount === 1) {
      return '1 photo selected';
    }
    return `${selectionCount} photos selected`;
  };

  return (
    <footer className="h-7 bg-white dark:bg-zinc-900 flex items-center justify-between px-4 text-xs text-zinc-600 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-800 flex-shrink-0">
      <div>
        <span>{photoCount} photos loaded</span>
      </div>
      <div>
        {getSelectionText()}
      </div>
    </footer>
  );
};

export default StatusBar;