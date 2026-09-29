'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bell, CircleCheck, UsersRound, Wallet } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function AuthShell({ children }) {
  return (
    <div className="auth">
      <div className="auth-form-side">
        <div className="row between" style={{ maxWidth: 400, width: '100%', margin: '0 auto 36px' }}>
          <Link href="/" className="brand" style={{ padding: 0 }}>
            <span className="brand-mark">
              <Logo />
            </span>
            Pockeazy
          </Link>
          <ThemeToggle />
        </div>
        <motion.div
          className="auth-form"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </div>

      <aside className="auth-art" aria-hidden>
        <motion.div
          className="float-card"
          style={{ top: '12%', left: '10%' }}
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <CircleCheck /> Submit report — done ✨
        </motion.div>
        <motion.div
          className="float-card"
          style={{ top: '28%', right: '9%' }}
          animate={{ y: [0, 14, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
        >
          <Bell /> Pay rent · tomorrow, 9 AM
        </motion.div>
        <motion.div
          className="float-card"
          style={{ top: '46%', left: '16%' }}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
        >
          <Wallet /> Food budget · 62% used
        </motion.div>
        <motion.div
          className="float-card"
          style={{ top: '62%', right: '12%' }}
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        >
          <UsersRound /> Rahul owes you ₹450
        </motion.div>
        <h2>Your day and your money, sorted in one pocket.</h2>
        <p>Tasks, reminders, budgets and split bills — on your phone and laptop, shared with the people who matter.</p>
      </aside>
    </div>
  );
}
