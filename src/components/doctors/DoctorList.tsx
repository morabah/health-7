import React, { useState, useMemo, useCallback } from 'react';
import DoctorCard from './DoctorCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Search, Filter, User, ArrowUpDown, Grid, List, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

// Type for doctor data
interface DoctorData {
  id: string;
  firstName: string;
  lastName: string;
  specialty?: string;
  location?: string;
  profilePictureUrl?: string;
  consultationFee?: number;
  rating?: number;
  reviewCount?: number;
  experience?: string | number;
  isVerified?: boolean;
  availableSoon?: boolean;
  languages?: string[];
  servicesOffered?: string[];
}

interface DoctorListProps {
  doctors: DoctorData[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSearch?: (query: string) => void;
  onFilter?: () => void;
  onSort?: (sortBy: string) => void;
  className?: string;
  showFilters?: boolean;
  showSearch?: boolean;
  emptyMessage?: string;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'rating' | 'name' | 'price';

const DoctorList: React.FC<DoctorListProps> = ({
  doctors,
  isLoading = false,
  error = null,
  onRetry,
  onSearch,
  onFilter,
  onSort,
  className,
  showFilters = true,
  showSearch = true,
  emptyMessage = "No doctors found matching your criteria."
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('rating');

  // Memoize the search handler to prevent recreation on every render
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  }, [onSearch, searchQuery]);

  // Memoize the sort handler to prevent recreation on every render
  const handleSort = useCallback((option: SortOption) => {
    setSortBy(option);
    if (onSort) {
      onSort(option);
    }
  }, [onSort]);

  // Memoize skeleton rendering to prevent recreation on every render
  const renderSkeletons = useCallback(() => {
    return Array(4).fill(0).map((_, index) => (
      <Card key={`skeleton-${index}`} className="overflow-hidden animate-pulse">
        <div className="p-5">
          <div className="w-full aspect-[4/3] bg-slate-200 dark:bg-slate-700 rounded-lg mb-4"></div>
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6 mb-2"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/6 mb-2"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/6"></div>
        </div>
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
          <div className="flex gap-2">
            <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded flex-1"></div>
            <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded flex-1"></div>
          </div>
        </div>
      </Card>
    ));
  }, []);

  // Memoize error rendering to prevent recreation on every render
  const renderError = useMemo(() => (
    <Card className="p-8 text-center">
      <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Failed to load doctors</h3>
      <p className="text-slate-500 dark:text-slate-400 mb-4">{error || "Something went wrong. Please try again."}</p>
      {onRetry && (
        <Button 
          variant="primary"
          onClick={onRetry}
          iconLeft={<RefreshCw className="h-4 w-4" />}
        >
          Try Again
        </Button>
      )}
    </Card>
  ), [error, onRetry]);

  // Memoize empty state rendering to prevent recreation on every render
  const renderEmpty = useMemo(() => (
    <Card className="p-8 text-center">
      <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mb-4">
        <User className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Doctors Found</h3>
      <p className="text-slate-500 dark:text-slate-400">{emptyMessage}</p>
    </Card>
  ), [emptyMessage]);

  return (
    <div className={className}>
      {/* Filters & Search Bar */}
      {(showFilters || showSearch) && (
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {showSearch && (
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search doctors by name, specialty..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 dark:text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="submit"
                  className="absolute inset-y-0 right-0 px-3 py-2 bg-primary text-white rounded-r-lg hover:bg-primary-600 transition-colors"
                >
                  Search
                </button>
              </div>
            </form>
          )}

          {showFilters && (
            <div className="flex gap-2">
              <div className="relative">
                <Button
                  variant="outline"
                  iconLeft={<Filter className="h-4 w-4" />}
                  onClick={onFilter}
                >
                  Filters
                </Button>
              </div>

              <div className="relative">
                <Button
                  variant="outline"
                  iconLeft={<ArrowUpDown className="h-4 w-4" />}
                  onClick={() => {
                    const nextSort = sortBy === 'rating' ? 'name' : sortBy === 'name' ? 'price' : 'rating';
                    handleSort(nextSort);
                  }}
                >
                  Sort by: {
                    sortBy === 'rating' ? 'Rating' : 
                    sortBy === 'name' ? 'Name' : 
                    'Price'
                  }
                </Button>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-lg flex overflow-hidden">
                <button
                  className={clsx(
                    "p-2",
                    viewMode === 'grid' 
                      ? "bg-slate-100 dark:bg-slate-700 text-primary" 
                      : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                  )}
                  onClick={useCallback(() => setViewMode('grid'), [])}
                  aria-label="Grid view"
                >
                  <Grid className="h-5 w-5" />
                </button>
                <button
                  className={clsx(
                    "p-2",
                    viewMode === 'list' 
                      ? "bg-slate-100 dark:bg-slate-700 text-primary" 
                      : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                  )}
                  onClick={useCallback(() => setViewMode('list'), [])}
                  aria-label="List view"
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Doctor List */}
      {error ? (
        renderError
      ) : isLoading ? (
        <div className={clsx(
          "grid gap-6",
          viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
        )}>
          {renderSkeletons()}
        </div>
      ) : doctors.length === 0 ? (
        renderEmpty
      ) : (
        <div className={clsx(
          "grid gap-6",
          viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
        )}>
          {doctors.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              compact={viewMode === 'list'}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorList; 