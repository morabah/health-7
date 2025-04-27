'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { 
  Search, 
  MapPin, 
  Globe, 
  DollarSign, 
  Stethoscope, 
  Calendar, 
  Star
} from 'lucide-react';

// Doctor Card Component
function DoctorCard({ id = "mock" }: { id?: string }) {
  return (
    <Card className="overflow-hidden" hoverable>
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Doctor Image */}
          <div className="flex-shrink-0">
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 mx-auto sm:mx-0">
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-500">
                <Stethoscope className="h-8 w-8" />
              </div>
            </div>
          </div>
          
          {/* Doctor Info */}
          <div className="flex-grow space-y-2 text-center sm:text-left">
            <h3 className="font-semibold text-lg">Dr. Placeholder</h3>
            
            <p className="text-slate-600 dark:text-slate-300 flex items-center justify-center sm:justify-start">
              <Stethoscope className="h-4 w-4 mr-1" />
              <span>Cardiology</span>
            </p>
            
            <div className="flex items-center space-x-2 justify-center sm:justify-start">
              <Badge variant="success" className="flex items-center">
                <Star className="h-3 w-3 mr-1" />
                4.8
              </Badge>
              <Badge variant="info">5 yrs exp</Badge>
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center">
                <MapPin className="h-3.5 w-3.5 mr-1" />
                New York
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center">
                <Globe className="h-3.5 w-3.5 mr-1" />
                English, Spanish
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center">
                <DollarSign className="h-3.5 w-3.5 mr-1" />
                $150 /session
              </span>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Link href={`/doctor-profile/${id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              <Stethoscope className="h-4 w-4 mr-2" />
              View Profile
            </Button>
          </Link>
          <Link href={`/book-appointment/${id}`} className="flex-1">
            <Button variant="primary" className="w-full">
              <Calendar className="h-4 w-4 mr-2" />
              Book Appointment
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

export default function FindDoctorsPage() {
  useEffect(() => {
    console.info('find-doctors rendered (static)');
  }, []);
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold dark:text-white">Find Doctors</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Search Filters */}
          <Card className="p-4 space-y-4">
            <h2 className="font-medium text-lg">Filter Options</h2>
            
            <div>
              <label htmlFor="specialty" className="text-sm font-medium mb-1 block">Specialty</label>
              <Input id="specialty" placeholder="E.g. Cardiology, Neurology..." />
            </div>
            
            <div>
              <label htmlFor="location" className="text-sm font-medium mb-1 block">Location</label>
              <Input id="location" placeholder="City, State, or Zip Code" />
            </div>
            
            <div>
              <label htmlFor="language" className="text-sm font-medium mb-1 block">Language</label>
              <Input id="language" placeholder="E.g. English, Spanish..." />
            </div>
            
            <Button variant="primary" className="w-full">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </Card>
          
          {/* Search Tips */}
          <Card className="p-4">
            <h3 className="font-medium mb-2">Search Tips</h3>
            <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <li>• Use precise specialty names for better results</li>
              <li>• Filter by location for nearby doctors</li>
              <li>• Specify language needs for better communication</li>
              <li>• Check doctor profiles for detailed information</li>
            </ul>
          </Card>
        </div>
        
        {/* Search Results */}
        <div className="lg:col-span-3 space-y-4">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Showing placeholder results
          </div>
          
          <div className="space-y-4">
            <DoctorCard id="doc1" />
            <DoctorCard id="doc2" />
          </div>
        </div>
      </div>
    </div>
  );
} 