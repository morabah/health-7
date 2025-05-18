'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { Search, Loader2 } from 'lucide-react';
import { useDebounce } from '@/lib/useDebounce';
import { logInfo } from '@/lib/logger';
import { LazyDoctorSearchResults } from '@/components/LazyComponents';
import { prefetchLazyComponents } from '@/components/LazyComponents';
import { startMeasurement, endMeasurement } from '@/lib/performanceMetrics';

// Modified SearchParams to be compatible with DoctorSearchParams
interface SearchParams extends Record<string, string> {
  specialty: string;
  location: string;
  name: string;
}

export default function FindDoctorsPage() {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    specialty: '',
    location: '',
    name: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Debounced search params to prevent excessive re-renders
  const debouncedSearchParams = useDebounce(searchParams, 300);

  // Prefetch doctor-related components on mount
  useEffect(() => {
    // Measure page load performance
    const perfId = startMeasurement('find-doctors-page-load');

    // Prefetch related components
    prefetchLazyComponents('doctors');

    // End measurement after components have loaded
    const timeoutId = setTimeout(() => {
      endMeasurement(perfId);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, []);

  // Handle search form input changes - memoize to prevent recreation on every render
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setSearchParams(prev => {
      const updated = { ...prev, [id]: value };
      logInfo('Search params updated', updated);
      return updated;
    });
  }, []);

  // Clear filters - memoize to prevent recreation on every render
  const handleClear = useCallback(() => {
    setSearchParams({ specialty: '', location: '', name: '' });
  }, []);

  // Memoize the grid layout classes to prevent recalculation on every render
  const gridLayoutClasses = useMemo(() => "grid grid-cols-1 lg:grid-cols-4 gap-6", []);
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold dark:text-white">Find Doctors</h1>

      <div className={gridLayoutClasses}>
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Search Filters */}
          <Card className="p-4 space-y-4">
            <h2 className="font-medium text-lg">Filter Options</h2>

            <div>
              <label htmlFor="specialty" className="text-sm font-medium mb-1 block">
                Specialty
              </label>
              <Input
                id="specialty"
                placeholder="E.g. Cardiology, Neurology..."
                value={searchParams.specialty}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="location" className="text-sm font-medium mb-1 block">
                Location
              </label>
              <Input
                id="location"
                placeholder="City, State, or Zip Code"
                value={searchParams.location}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="name" className="text-sm font-medium mb-1 block">
                Doctor Name
              </label>
              <Input
                id="name"
                placeholder="Search by doctor name"
                value={searchParams.name}
                onChange={handleInputChange}
              />
            </div>

            <Button
              variant="primary"
              className="w-full flex items-center justify-center"
              onClick={() => {}}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search Doctors
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              className="w-full mt-2"
              onClick={handleClear}
              disabled={isLoading}
            >
              Clear Filters
            </Button>
          </Card>
        </div>

        {/* Main Content - Using the optimized lazy-loaded component */}
        <div className="lg:col-span-3">
          <LazyDoctorSearchResults searchParams={debouncedSearchParams} />
        </div>
      </div>
    </div>
  );
}
