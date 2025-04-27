'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { logInfo } from '@/lib/logger';

// Define user types
export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN' | null;

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (role: UserRole) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  // Mock login function
  const login = (role: UserRole) => {
    if (!role) {
      setUser(null);
      logInfo('auth-event', { action: 'logout' });
      return;
    }

    const mockUsers = {
      PATIENT: {
        id: 'patient-123',
        email: 'patient@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'PATIENT' as UserRole,
      },
      DOCTOR: {
        id: 'doctor-456',
        email: 'doctor@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'DOCTOR' as UserRole,
      },
      ADMIN: {
        id: 'admin-789',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN' as UserRole,
      },
    };

    setUser(mockUsers[role as keyof typeof mockUsers]);
    logInfo('auth-event', { action: 'login', role });
  };

  const logout = () => {
    setUser(null);
    logInfo('auth-event', { action: 'logout' });
  };

  // Expose mock login for testing in development
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.__mockLogin = login;
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        // @ts-ignore
        delete window.__mockLogin;
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 