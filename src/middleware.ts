import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostname = req.headers.get('host') || '';
  const { pathname } = url;

  // Define your production domains
  const appDomain = 'app.narros.com.br';
  const mainDomain = 'narros.com.br';

  // Check if the current host is for the app
  // For local dev, we treat it as the app domain to allow testing
  const isAppDomain = hostname === appDomain || hostname.includes('localhost');

  // If on the app domain and at the root, redirect to the dashboard
  if (isAppDomain && pathname === '/') {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }
  
  // If on the main marketing domain and trying to access the app, redirect to home
  if (hostname === mainDomain && pathname.startsWith('/dashboard')) {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Match all paths except for static files and specific assets
export const config = {
   matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|narros-favicon.svg|narros-logo.svg).*)',
  ],
};
