'use client';
import { createContext, useContext, useState } from 'react';
export const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} });
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, set] = useState<'light' | 'dark'>('light');
  const toggleTheme = () => set(t => (t === 'light' ? 'dark' : 'light'));
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};
export const useTheme = () => useContext(ThemeContext); 