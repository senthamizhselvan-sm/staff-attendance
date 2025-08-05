import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if the request is for the admin dashboard (but not the login page)
  if (request.nextUrl.pathname === '/admin' && !request.nextUrl.pathname.includes('/login')) {
    // Check if user is authenticated (this will be handled client-side)
    // For now, we'll let the client-side handle the redirect
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
}; 