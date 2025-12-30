
import React from 'react';
import { PencilIcon, BotIcon, MessageSquareIcon, TrashIcon } from './icons';
import { ChatSession } from '../types';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (session: ChatSession) => void;
  onDeleteSession: (id: string) => void;
}

export const SideMenu: React.FC<SideMenuProps> = ({ 
    isOpen, 
    onClose, 
    onNewChat,
    sessions,
    currentSessionId,
    onSelectSession,
    onDeleteSession
}) => {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl border-r border-gray-200 dark:border-white/10 p-4 flex flex-col z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between mb-6">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-600 rounded-lg">
                <BotIcon className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Sega</h2>
           </div>
        </div>
        
        <button
          onClick={onNewChat}
          className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 bg-indigo-600 text-white hover:bg-indigo-700 mb-6 shadow-lg shadow-indigo-500/20"
        >
          <PencilIcon className="w-4 h-4" />
          <span className="ml-2">New Chat</span>
        </button>

        <div className="flex-1 overflow-y-auto space-y-2 -mx-2 px-2">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2">Recent History</h3>
            {sessions.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-500 text-sm mt-8 italic">
                    No chat history yet.
                </div>
            ) : (
                sessions.map(session => (
                    <button
                        key={session.id}
                        onClick={() => onSelectSession(session)}
                        className={`group flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 border ${
                            currentSessionId === session.id 
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' 
                            : 'bg-transparent border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        <MessageSquareIcon className={`w-4 h-4 mr-3 flex-shrink-0 ${currentSessionId === session.id ? 'text-indigo-500' : 'text-gray-400'}`} />
                        <span className="flex-1 truncate text-left">{session.title}</span>
                        <div 
                            onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }} 
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-opacity"
                            title="Delete chat"
                        >
                            <TrashIcon className="w-3.5 h-3.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400" />
                        </div>
                    </button>
                ))
            )}
        </div>
        
        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800 text-xs text-center text-gray-400 dark:text-gray-500">
            Sega v2.2 Preview
        </div>

      </aside>
    </>
  );
};
