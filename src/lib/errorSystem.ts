/**
 * Error System
 * 
 * This file provides a centralized way to initialize and configure the error handling
 * system throughout the application. It should be imported early in the application
 * lifecycle, typically in a layout file or initialization component.
 */

import { initErrorSystem } from '@/hooks/useErrorSystem';
import { ErrorMonitor } from '@/lib/errors/errorMonitoring';

/**
 * Initialize the application error handling system
 */
export function setupErrorHandling() {
  // Initialize core error system components
  initErrorSystem();
  
  // Set up global error handlers
  if (typeof window !== 'undefined') {
    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled Promise Rejection:', event.reason);
      
      // Report to error monitoring system
      ErrorMonitor.getInstance().reportError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        { unhandledRejection: true }
      );
    });
    
    // Capture global errors
    window.addEventListener('error', (event) => {
      console.error('Global Error:', event.error || event.message);
      
      // Report to error monitoring system
      ErrorMonitor.getInstance().reportError(
        event.error || new Error(event.message),
        { 
          unhandledError: true,
          lineNumber: event.lineno,
          columnNumber: event.colno,
          fileName: event.filename
        }
      );
    });
  }
  
  console.log('✅ Error handling system initialized');
}

/**
 * Example usage in app:
 * 
 * // In a root layout file
 * import { setupErrorHandling } from '@/lib/errorSystem';
 * 
 * export function RootLayout({ children }) {
 *   // Initialize error handling system
 *   useEffect(() => {
 *     setupErrorHandling();
 *   }, []);
 *   
 *   return (
 *     <html lang="en">
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * 
 * // In a component
 * import { useErrorSystem } from '@/hooks/useErrorSystem';
 * 
 * export function MyComponent() {
 *   const { 
 *     handleError, 
 *     withErrorHandling, 
 *     clearError,
 *     hasError,
 *     message 
 *   } = useErrorSystem({
 *     component: 'MyComponent',
 *     defaultCategory: 'data',
 *     autoDismiss: true
 *   });
 *   
 *   // Use the error handling system
 *   const fetchData = withErrorHandling(async () => {
 *     // Your async code here
 *   });
 *   
 *   return (
 *     <div>
 *       {hasError && <div className="error">{message}</div>}
 *       <button onClick={fetchData}>Fetch Data</button>
 *       {hasError && <button onClick={clearError}>Clear Error</button>}
 *     </div>
 *   );
 * }
 */ 