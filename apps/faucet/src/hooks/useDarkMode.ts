import { useState, useEffect } from 'react';

export const useDarkMode = () => {
  // Initialize state from the DOM (HTML script already applied theme)
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    // Sync React state with DOM on mount (HTML script already applied theme)
    const currentlyDark = document.documentElement.classList.contains('dark');
    setIsDark(currentlyDark);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Only update if no manual preference is stored
      if (!localStorage.getItem('theme')) {
        setIsDark(e.matches);
        document.documentElement.classList.toggle('dark', e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  const toggle = () => {
    const newDarkState = !isDark;
    setIsDark(newDarkState);
    
    // Update document class
    document.documentElement.classList.toggle('dark', newDarkState);
    
    // Store preference in localStorage
    localStorage.setItem('theme', newDarkState ? 'dark' : 'light');
  };

  const useSystemTheme = () => {
    // Remove manual preference and use system theme
    localStorage.removeItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
    document.documentElement.classList.toggle('dark', prefersDark);
  };

  return { isDark, toggle, useSystemTheme };
};