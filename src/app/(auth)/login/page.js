import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions, googleEnabled } from '@/lib/auth';
import { safeCallback } from '@/lib/safe-callback';
import LoginForm from '@/components/auth/LoginForm';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  const callbackUrl = safeCallback(sp?.callbackUrl);
  const session = await getServerSession(authOptions);
  if (session) redirect(callbackUrl);
  return <LoginForm googleEnabled={googleEnabled} callbackUrl={callbackUrl} initialError={sp?.error} />;
}
