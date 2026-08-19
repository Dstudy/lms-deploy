import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';

  // Bypass redirection during local development
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return NextResponse.next();
  }

  // Redirect if accessed via the IP or directly via port 9002
  if (host.includes('13.70.26.154') || host.includes(':9002')) {
    const { pathname, search } = request.nextUrl;
    const targetUrl = `https://lms.eastasia.cloudapp.azure.com${pathname}${search}`;
    return NextResponse.redirect(targetUrl, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
