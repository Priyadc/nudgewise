import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AppShell from '@/components/layout/AppShell';

export default async function AppLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  return (
    <Suspense fallback={null}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
