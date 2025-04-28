'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode} from 'react';
import { createElement } from 'react';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export { queryClient };

// Provider wrapper component
export function QueryProvider({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}