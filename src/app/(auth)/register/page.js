import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions, googleEnabled } from '@/lib/auth';
import { safeCallback } from '@/lib/safe-callback';
import RegisterForm from '@/components/auth/RegisterForm';

export const metadata = { title: 'Create account' };

export default async function RegisterPage({ searchParams }) {
  const sp = await searchParams;
  const callbackUrl = safeCallback(sp?.callbackUrl);
  const session = await getServerSession(authOptions);
  if (session) redirect(callbackUrl);
  return <RegisterForm googleEnabled={googleEnabled} callbackUrl={callbackUrl} />;
}
