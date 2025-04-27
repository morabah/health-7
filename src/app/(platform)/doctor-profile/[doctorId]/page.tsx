'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Tab } from '@headlessui/react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { 
  Stethoscope, 
  MapPin, 
  Calendar, 
  Globe, 
  DollarSign, 
  Star,
  MessageSquare
} from 'lucide-react';

// Helper components
function PlaceholderLine({ text }: { text: string }) {
  return (
    <div className="py-4 text-center text-slate-500 dark:text-slate-400">
      {text}
    </div>
  );
}

// Sidebar doctor info card
function DoctorSidebar({ doctorId }: { doctorId: string }) {
  return (
    <Card className="h-fit sticky top-4">
      <div className="p-4 flex flex-col items-center">
        {/* Doctor Image */}
        <div className="relative w-32 h-32 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 mb-4">
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-500">
            <Stethoscope className="h-12 w-12" />
          </div>
        </div>
        
        {/* Doctor Basic Info */}
        <h2 className="text-xl font-semibold text-center mb-1">Dr. Jane Placeholder</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-4 flex items-center justify-center">
          <Stethoscope className="h-4 w-4 mr-1" />
          <span>Cardiology</span>
        </p>
        
        <div className="w-full space-y-2 mb-4">
          <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
            <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>123 Medical Center, Suite 101, New York, NY</span>
          </div>
          
          <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
            <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>English, Spanish</span>
          </div>
          
          <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
            <DollarSign className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>$150 per consultation</span>
          </div>
          
          <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
            <Star className="h-4 w-4 mr-2 flex-shrink-0 text-yellow-500" />
            <span>4.8 (124 reviews)</span>
          </div>
        </div>
        
        {/* Book Appointment Button */}
        <Link href={`/book-appointment/${doctorId}`} className="w-full">
          <Button variant="primary" className="w-full">
            <Calendar className="h-4 w-4 mr-2" />
            Book Appointment
          </Button>
        </Link>
      </div>
    </Card>
  );
}

export default function DoctorProfilePage() {
  const params = useParams();
  const doctorId = params.doctorId as string;
  
  useEffect(() => {
    console.info('doctor-profile rendered (static)', { doctorId });
  }, [doctorId]);
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold dark:text-white">Doctor Profile</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <DoctorSidebar doctorId={doctorId} />
        </div>
        
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <Tab.Group>
              <Tab.List className="flex border-b border-slate-200 dark:border-slate-700">
                <Tab className={({ selected }) => 
                  `py-3 px-4 text-sm font-medium outline-none transition-colors duration-200 ease-in-out ${
                    selected 
                      ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400' 
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                  }`
                }>
                  Biography
                </Tab>
                <Tab className={({ selected }) => 
                  `py-3 px-4 text-sm font-medium outline-none transition-colors duration-200 ease-in-out ${
                    selected 
                      ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400' 
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                  }`
                }>
                  Education
                </Tab>
                <Tab className={({ selected }) => 
                  `py-3 px-4 text-sm font-medium outline-none transition-colors duration-200 ease-in-out ${
                    selected 
                      ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400' 
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                  }`
                }>
                  Services
                </Tab>
              </Tab.List>
              
              <Tab.Panels className="p-4">
                <Tab.Panel>
                  <PlaceholderLine text="Loading biography ..." />
                </Tab.Panel>
                <Tab.Panel>
                  <PlaceholderLine text="Loading education history ..." />
                </Tab.Panel>
                <Tab.Panel>
                  <PlaceholderLine text="Loading services offered ..." />
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          </Card>
          
          {/* Reviews Section */}
          <Card>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-primary" />
                <h2 className="text-lg font-medium">Patient Reviews</h2>
              </div>
              <Badge variant="success" className="flex items-center">
                <Star className="h-3.5 w-3.5 mr-1 text-yellow-500" />
                4.8
              </Badge>
            </div>
            <PlaceholderLine text="Loading reviews ..." />
          </Card>
        </div>
      </div>
    </div>
  );
} 