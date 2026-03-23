import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostname = req.headers.get('host') || '';
  const { pathname } = url;

  // Define domains
  const mainDomain = 'narros.com.br';
  const appDomain = `app.${mainDomain}`;

  // Handle local development - do nothing
  if (hostname.includes('localhost')) {
    return NextResponse.next();
  }

  // --- Handle production domains ---

  // Current host is the marketing domain (or www)
  if (hostname === mainDomain || hostname === `www.${mainDomain}`) {
    // If trying to access an app page (/login, /dashboard/*, /collaborator/*) on the marketing domain,
    // redirect to the app domain with the same path.
    if (pathname.startsWith('/login') || pathname.startsWith('/dashboard') || pathname.startsWith('/collaborator')) {
      url.host = appDomain;
      return NextResponse.redirect(url);
    }
    // Otherwise, allow access (it's a marketing page).
    return NextResponse.next();
  }

  // Current host is the app domain
  if (hostname === appDomain) {
    // Rewrite the root path `/` to `/dashboard`.
    // The dashboard's layout component will then handle authentication checks
    // and redirect to /login if necessary. This prevents the marketing
    // homepage from ever showing on the app domain.
    if (pathname === '/') {
      url.pathname = '/dashboard';
      return NextResponse.rewrite(url);
    }
    // Allow access to all other paths on the app domain.
    return NextResponse.next();
  }

  return NextResponse.next();
}

// Match all paths except for static files and specific assets
export const config = {
   matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|narros-favicon.svg|narros-logo.svg).*)',
  ],
};
