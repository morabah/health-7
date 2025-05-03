import React, { useState } from 'react';
import { useAuth, type StoredSession } from '@/context/AuthContext';
import { UserType } from '@/types/enums';

const getUserRoleLabel = (role: UserType): string => {
  switch (role) {
    case UserType.ADMIN:
      return 'Admin';
    case UserType.DOCTOR:
      return 'Doctor';
    case UserType.PATIENT:
      return 'Patient';
    default:
      return 'User';
  }
};

const getUserRoleColor = (role: UserType): string => {
  switch (role) {
    case UserType.ADMIN:
      return 'bg-red-100 text-red-800';
    case UserType.DOCTOR:
      return 'bg-blue-100 text-blue-800';
    case UserType.PATIENT:
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function UserSwitcher() {
  const { user, activeSessions, switchToSession, multiLoginEnabled } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // If multi-login is not enabled or we have no sessions, don't render
  if (!multiLoginEnabled || activeSessions.length <= 1) {
    return null;
  }

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  const handleSwitchUser = async (sessionId: string) => {
    if (sessionId === user?.sessionId) {
      // Already using this session
      closeDropdown();
      return;
    }

    await switchToSession(sessionId);
    closeDropdown();
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 14a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
        </svg>
        <span>Switch User</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop to capture clicks outside dropdown */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={closeDropdown}
            aria-hidden="true"
          />
          
          <div
            className="absolute right-0 z-20 mt-2 w-72 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="user-menu-button"
            tabIndex={-1}
          >
            <div className="py-1 divide-y divide-gray-100">
              <div className="px-4 py-2 text-sm text-gray-700 font-medium">
                Active Accounts
              </div>
              <div className="max-h-64 overflow-y-auto">
                {activeSessions.map((session) => {
                  const isActive = user?.sessionId === session.sessionId;
                  const roleLabel = getUserRoleLabel(session.role);
                  const roleColor = getUserRoleColor(session.role);
                  
                  return (
                    <button
                      key={session.sessionId}
                      onClick={() => handleSwitchUser(session.sessionId)}
                      className={`w-full px-4 py-2 text-left flex items-center justify-between ${
                        isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
                      }`}
                      role="menuitem"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {session.displayName || session.email}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(session.lastActive).toLocaleString()}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${roleColor}`}
                      >
                        {isActive ? `Active ${roleLabel}` : roleLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 