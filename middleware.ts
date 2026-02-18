import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Allow all requests to pass through
  // Authentication is handled by NextAuth and getServerSession in API routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.svg (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.svg|og-image.png|robots.txt).*)',
  ],
};
