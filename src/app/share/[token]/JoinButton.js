'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/client/api';

export default function JoinButton({ token }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function join() {
    setLoading(true);
    try {
      const d = await api(`/api/lists/join/${token}`, { method: 'POST' });
      toast.success('You joined the list 🎉');
      router.push(`/tasks?list=${d.listId}`);
    } catch (err) {
      toast.error(err.message);
      setLoading(false);
    }
  }

  return (
    <button className="btn btn-primary btn-lg btn-block" onClick={join} disabled={loading}>
      {loading ? <Loader2 className="spin" /> : <UserPlus />} Join list
    </button>
  );
}
