'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Users, UserRound, Stethoscope, ShieldAlert, ArrowRight } from 'lucide-react';

// Stat component for dashboard statistics
function Stat({ title, Icon }: { title: string; Icon: React.ComponentType<any> }) {
  return (
    <Card className="p-6">
      <div className="flex items-center space-x-3 mb-3">
        <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-full">
          <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        </div>
        <h3 className="font-medium text-slate-600 dark:text-slate-300">{title}</h3>
      </div>
      <p className="text-2xl font-bold">—</p>
    </Card>
  );
}

// Card header with link component
function HeaderWithLink({ title, href }: { title: string; href: string }) {
  return (
    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
      <h2 className="text-lg font-medium">{title}</h2>
      <Link href={href}>
        <Button variant="ghost" size="sm">
          View all
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

// Placeholder line for loading content
function PlaceholderLine({ text }: { text: string }) {
  return (
    <div className="p-6 text-center text-slate-500 dark:text-slate-400">
      {text}
    </div>
  );
}

export default function AdminDashboard() {
  useEffect(() => {
    console.info('admin-dashboard rendered (static)');
  }, []);
  
  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold mb-6 dark:text-white">Admin Dashboard</h1>

      {/* Stats grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat title="Total Users" Icon={Users} />
        <Stat title="Patients" Icon={UserRound} />
        <Stat title="Doctors" Icon={Stethoscope} />
        <Stat title="Pending Verifications" Icon={ShieldAlert} />
      </section>

      {/* Recent users */}
      <Card>
        <HeaderWithLink title="Recent Users" href="/admin/users" />
        <PlaceholderLine text="Loading users …" />
      </Card>

      {/* Pending verifications */}
      <Card>
        <HeaderWithLink title="Pending Doctor Verifications" href="/admin/doctors?status=PENDING" />
        <PlaceholderLine text="Loading pending doctors …" />
      </Card>
    </div>
  );
} 