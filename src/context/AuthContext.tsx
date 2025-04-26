'use client';
import { createContext, useContext } from 'react';
export const AuthContext = createContext({ user: null as any });
export const AuthProvider = ({ children }: { children: React.ReactNode }) => (
  <AuthContext.Provider value={{ user: null }}>{children}</AuthContext.Provider>
);
export const useAuth = () => useContext(AuthContext); 