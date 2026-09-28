import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Landing from '@/components/landing/Landing';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  return <Landing signedIn={Boolean(session)} />;
}
