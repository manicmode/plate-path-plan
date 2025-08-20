
import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    // Single-source theme application - never clear all classes, only toggle 'dark'
    document.documentElement.classList.toggle('dark', !!isDarkMode);
    
    // STEP 2: Forensics - log theme changes
    console.log('[theme] html.class=', document.documentElement.className);
    console.log('[boot] theme:apply', {
      isDarkMode,
      htmlClass: document.documentElement.className,
      bodyBg: getComputedStyle(document.body).backgroundColor
    });
    setTimeout(() => console.log('[theme+80ms]', document.documentElement.className), 80);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
