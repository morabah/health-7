import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

/**
 * Custom hook for managing dark mode
 * Syncs with localStorage and respects system preferences
 * 
 * @returns {[Theme, () => void]} Current theme and toggle function
 * 
 * @example
 * const [theme, toggleTheme] = useDarkMode();
 * 
 * return (
 *   <button onClick={toggleTheme}>
 *     Current theme: {theme}
 *   </button>
 * );
 */
function useDarkMode(): [Theme, () => void] {
  // Use state to track current theme
  const [theme, setTheme] = useState<Theme>('light');
  
  // Initialize theme on mount
  useEffect(() => {
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
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // Toggle between light and dark
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };
  
  return [theme, toggleTheme];
}

export default useDarkMode; 