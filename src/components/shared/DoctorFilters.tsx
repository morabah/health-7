'use client';

import React, { useCallback } from 'react';
import { VerificationStatus } from '@/types/enums';

// Specialties for the dropdown
const SPECIALTIES = [
  'All Specialties',
  'General Medicine',
  'Cardiology',
  'Dermatology',
  'Neurology',
  'Pediatrics',
  'Orthopedics',
  'Obstetrics and Gynecology',
  'Psychiatry',
  'Ophthalmology',
  'Urology'
];

interface DoctorFiltersProps {
  filters: {
    specialty: string;
    name: string;
    status: string;
  };
  onFilterChange: (filters: {
    specialty: string;
    name: string;
    status: string;
  }) => void;
}

/**
 * Filter component for the doctor list
 * Uses debounced input for name search
 */
export default function DoctorFilters({ filters, onFilterChange }: DoctorFiltersProps) {
  // Debounce the name search to avoid excessive API calls
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onFilterChange({ ...filters, name: value });
  }, [filters, onFilterChange]);
  
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Name search */}
        <div>
          <label htmlFor="name-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Doctor Name
          </label>
          <input
            id="name-filter"
            type="text"
            placeholder="Search by name"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            value={filters.name}
            onChange={handleNameChange}
          />
        </div>
        
        {/* Specialty filter */}
        <div>
          <label htmlFor="specialty-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Specialty
          </label>
          <select
            id="specialty-filter"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            value={filters.specialty}
            onChange={(e) => onFilterChange({ ...filters, specialty: e.target.value })}
          >
            {SPECIALTIES.map((specialty) => (
              <option key={specialty} value={specialty === 'All Specialties' ? '' : specialty}>
                {specialty}
              </option>
            ))}
          </select>
        </div>
        
        {/* Status filter */}
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            id="status-filter"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            value={filters.status}
            onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
          >
            <option value="">All Statuses</option>
            <option value={VerificationStatus.VERIFIED}>Verified</option>
            <option value={VerificationStatus.PENDING}>Pending</option>
            <option value={VerificationStatus.REJECTED}>Rejected</option>
          </select>
        </div>
      </div>
    </div>
  );
} 