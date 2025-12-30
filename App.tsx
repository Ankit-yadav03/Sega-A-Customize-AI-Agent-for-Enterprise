import React, { useState, useEffect } from 'react';
import { ChatView } from './components/ChatView';

const App: React.FC = () => {
  const [isDark, setIsDark] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleThemeToggle = () => {
    setIsTransitioning(true);
    setShowNotification(true);
    
    // Start transition sequence
    setTimeout(() => {
        const nextState = !isDark;
        setIsDark(nextState);
        
        if (nextState) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        
        // End transition
        setTimeout(() => {
            setIsTransitioning(false);
            setShowNotification(false);
        }, 800);
    }, 800);
  };

  return (
    <>
        <div className={`h-screen w-full font-sans transition-all duration-700 ${isTransitioning ? 'blur-md scale-[0.98] opacity-80' : ''}`}>
            <ChatView isDark={isDark} onToggleTheme={handleThemeToggle} />
        </div>
        {showNotification && (
             <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                 <div className="bg-black/80 dark:bg-white/80 text-white dark:text-gray-900 px-8 py-4 rounded-2xl backdrop-blur-xl text-xl font-medium animate-pulse shadow-2xl">
                    Switching to {isDark ? 'Light' : 'Dark'} Mode...
                 </div>
            </div>
        )}
    </>
  );
};

export default App;