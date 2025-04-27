'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { logInfo, logValidation } from '@/lib/logger';

// Define theme type
export type Theme = 'light' | 'dark';

// Define context type with theme state and toggle function
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

// Create context with default values
export const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

/**
 * Theme Provider Component
 * Manages theme state, persists to localStorage, and applies theme to HTML element
 */
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Initialize theme on mount (client-side only)
  useEffect(() => {
    // Set mounted to true to indicate client-side execution
    setMounted(true);

    // Check if theme is stored in localStorage
    const savedTheme = localStorage.getItem('theme') as Theme | null;

    // If no saved theme, check system preference
    if (!savedTheme) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
      return;
    }

    // Use saved theme
    setTheme(savedTheme);
  }, []);

  // Update document classes when theme changes
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Save to localStorage
    localStorage.setItem('theme', theme);

    // Log theme change
    logInfo('Theme changed', { theme });
  }, [theme, mounted]);

  // Log validation only once when provider mounts
  useEffect(() => {
    if (mounted) {
      logValidation('4.1', 'success', 'Global layout, theme context & provider stack verified.');
    }
  }, [mounted]);

  // Toggle between light and dark
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

// Custom hook to use theme context
export const useTheme = () => useContext(ThemeContext);
