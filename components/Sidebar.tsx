import React from 'react';
import { AppMode } from '../types';
import { BotIcon, ImageIcon, MicIcon } from './icons';

interface SidebarProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: AppMode;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive
          ? 'bg-indigo-600 text-white'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`}
    >
      {icon}
      <span className="ml-3">{label}</span>
    </button>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ currentMode, setMode }) => {
  const navItems = [
    { id: AppMode.Chat, icon: <BotIcon className="w-5 h-5" />, label: AppMode.Chat },
    { id: AppMode.ImageGen, icon: <ImageIcon className="w-5 h-5" />, label: AppMode.ImageGen },
    { id: AppMode.Transcription, icon: <MicIcon className="w-5 h-5" />, label: AppMode.Transcription },
  ];

  return (
    <aside className="w-64 h-full bg-gray-800 p-4 flex flex-col">
      <div className="flex items-center mb-8">
        <div className="p-2 bg-indigo-600 rounded-lg">
          <BotIcon className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-bold ml-3 text-white">Sega AI Suite</h1>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            isActive={currentMode === item.id}
            onClick={() => setMode(item.id)}
          />
        ))}
      </nav>
    </aside>
  );
};