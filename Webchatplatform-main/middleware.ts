import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/create', '/human-support', '/chatbot', '/settings', '/pricing-plans'];

// Routes that are public (no auth required)
const publicRoutes = ['/', '/login', '/signup', '/pricing', '/gallery'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if route needs protection
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
    const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith('/api/'));

    // If not protected, allow through
    if (!isProtectedRoute) {
        return NextResponse.next();
    }

    // Check for auth cookie
    const accessToken = request.cookies.get('sb-access-token')?.value;

    // If no auth token and trying to access protected route, redirect to login
    if (!accessToken) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Allow authenticated access
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - api routes (they handle their own auth)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, images, etc.
         */
        '/((?!api|_next/static|_next/image|favicon.ico|widget.js|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
    ],
};
