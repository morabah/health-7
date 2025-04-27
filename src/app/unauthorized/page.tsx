import Link from 'next/link';
import { ShieldAlert, Home, LogIn } from 'lucide-react';
import Button from '@/components/ui/Button';

/**
 * Unauthorized access page (403)
 * Shown when a user attempts to access a page they don't have permission for
 */
export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <ShieldAlert className="text-danger h-16 w-16 mb-6" />
      <h1 className="text-3xl font-bold mb-4">Unauthorized Access</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md">
        You don&apos;t have permission to access this page. Please log in with an account that has
        the required role.
      </p>

      <div className="flex flex-wrap gap-4 justify-center">
        <Link href="/">
          <Button variant="outline" className="flex items-center gap-2">
            <Home size={16} />
            Home
          </Button>
        </Link>
        <Link href="/auth/login">
          <Button className="flex items-center gap-2">
            <LogIn size={16} />
            Log In
          </Button>
        </Link>
      </div>
    </div>
  );
}
