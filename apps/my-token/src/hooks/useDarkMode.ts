import { useState, useEffect } from 'react';

export const useDarkMode = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Initialize theme based on localStorage or system preference
    const initializeTheme = () => {
      const stored = localStorage.getItem('theme');
      
      if (stored === 'dark') {
        setIsDark(true);
        document.documentElement.classList.add('dark');
      } else if (stored === 'light') {
        setIsDark(false);
        document.documentElement.classList.remove('dark');
      } else {
        // No preference stored, use system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDark(prefersDark);
        document.documentElement.classList.toggle('dark', prefersDark);
      }
    };

    initializeTheme();

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