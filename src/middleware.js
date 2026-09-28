import { withAuth } from 'next-auth/middleware';

// Signed-out visitors hitting any app page are sent to /login?callbackUrl=...
export default withAuth({ pages: { signIn: '/login' } });

export const config = {
  matcher: ['/dashboard/:path*', '/tasks/:path*', '/reminders/:path*', '/finance/:path*', '/settings/:path*'],
};
