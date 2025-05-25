'use client';

import { isFirebaseEnabled } from '@/lib/firebaseConfig';
import { IS_MOCK_MODE } from '@/config/appConfig';

export default function DebugConfigPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Configuration</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">Environment Variables</h2>
          <pre className="mt-2 text-sm">
            {JSON.stringify({
              NEXT_PUBLIC_FIREBASE_ENABLED: process.env.NEXT_PUBLIC_FIREBASE_ENABLED,
              NEXT_PUBLIC_API_MODE: process.env.NEXT_PUBLIC_API_MODE,
              NODE_ENV: process.env.NODE_ENV,
            }, null, 2)}
          </pre>
        </div>
        
        <div className="bg-blue-100 p-4 rounded">
          <h2 className="font-semibold">Computed Values</h2>
          <pre className="mt-2 text-sm">
            {JSON.stringify({
              isFirebaseEnabled,
              IS_MOCK_MODE,
            }, null, 2)}
          </pre>
        </div>
        
        <div className="bg-green-100 p-4 rounded">
          <h2 className="font-semibold">Logic Check</h2>
          <pre className="mt-2 text-sm">
            {JSON.stringify({
              'process.env.NEXT_PUBLIC_FIREBASE_ENABLED': process.env.NEXT_PUBLIC_FIREBASE_ENABLED,
              'process.env.NEXT_PUBLIC_FIREBASE_ENABLED === "true"': process.env.NEXT_PUBLIC_FIREBASE_ENABLED === 'true',
              'isFirebaseEnabled calculation': process.env.NEXT_PUBLIC_FIREBASE_ENABLED === 'true' || false,
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
} 