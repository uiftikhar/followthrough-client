import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

// Define public routes that don't require authentication
const publicRoutes = ['/', '/auth/login', '/auth/register'];

// Define auth pages that authenticated users should be redirected from
const authPages = ['/auth/login', '/auth/register'];

export function middleware(request: NextRequest) {
  // Get the auth token from cookies
  const authToken = request.cookies.get('auth_token')?.value;
  
  // Check if the path is a public route
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname === route ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api')
  );

  // If not authenticated and trying to access a protected route, redirect to login
  if (!authToken && !isPublicRoute) {
    const loginUrl = new URL('/auth/login', request.url);
    // Store the original URL to redirect back after login
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated and trying to access login/register page, redirect to dashboard
  if (authToken && authPages.includes(request.nextUrl.pathname)) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

// Configure which paths should run the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 