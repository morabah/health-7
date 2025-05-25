/**
 * CORS Proxy API Route
 * 
 * This route acts as a proxy between the frontend and Firebase Cloud Functions,
 * bypassing CORS restrictions during local development.
 */

import { NextResponse } from 'next/server';
import { logInfo, logError } from '@/lib/logger';

/**
 * Handle POST requests to the CORS proxy
 */
export async function POST(request: Request) {
  try {
    // Extract target URL and payload from the request
    const { targetUrl, payload } = await request.json();
    
    logInfo('CORS Proxy: Forwarding request', { targetUrl, payload });
    
    // Forward the request to the target URL
    try {
      // Format the payload according to Firebase Cloud Functions expectations
      // Firebase expects { data: payload }
      const firebasePayload = { data: payload };
      
      logInfo('CORS Proxy: Formatted payload for Firebase', { firebasePayload });
      
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3001'
        },
        body: JSON.stringify(firebasePayload),
      });
      
      if (!response.ok) {
        logError('CORS Proxy: Firebase function responded with error', { 
          status: response.status, 
          statusText: response.statusText 
        });
        
        // Try to extract error details if possible
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: 'Could not parse error response' };
        }
        
        return NextResponse.json(
          { success: false, error: errorData },
          {
            status: response.status,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
          }
        );
      }
      
      // Extract response data
      const data = await response.json();
      
      logInfo('CORS Proxy: Success response', { status: response.status });
      
      // Return response with CORS headers
      return NextResponse.json(data, {
        status: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } catch (fetchError) {
      logError('CORS Proxy: Fetch error', { error: fetchError });
      throw new Error(`Failed to fetch from target URL: ${String(fetchError)}`);
    }
  } catch (error) {
    logError('CORS Proxy Error:', error);
    
    // Return error response
    return NextResponse.json(
      { error: 'Failed to proxy request' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}
