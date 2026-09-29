'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Bell, BellRing, CircleCheck, Mic, PiggyBank, UsersRound, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import Logo from '@/components/ui/Logo';
import { api } from '@/lib/client/api';
import { enablePush, pushPermission } from '@/lib/client/push';
import { useApp } from './AppContext';

const SLIDES = [
  {
    key: 'hello',
    art: (
      <span className="ob-logo">
        <Logo size={46} />
      </span>
    ),
    title: (name) => `Welcome to Pockeazy${name ? `, ${name}` : ''}! 👋`,
    text: 'Your tasks, reminders and money — sorted in one pocket. Here is a 20-second tour.',
  },
  {
    key: 'tasks',
    art: (
      <div className="ob-icons">
        <CircleCheck />
        <Bell />
        <Mic />
      </div>
    ),
    title: () => 'Plan your day in a few taps',
    text: 'Tap + (or press N) to add a task or reminder. Pick a day, a time and a reminder with chips — or just say it out loud.',
  },
  {
    key: 'money',
    art: (
      <div className="ob-icons">
        <Wallet />
        <UsersRound />
        <PiggyBank />
      </div>
    ),
    title: () => 'Know where every rupee goes',
    text: 'Log spending in seconds, split bills with friends, and fill up savings goals. Press / anytime to search everything.',
  },
  {
    key: 'notify',
    art: (
      <div className="ob-icons">
        <BellRing />
      </div>
    ),
    title: () => 'Never miss a thing',
    text: 'Allow notifications so reminders and bill alerts reach you even when the app is closed. You can mark them done right from the notification.',
  },
];

/** A short welcome tour, shown once to every account */
export default function Onboarding() {
  const { user, setUser, features } = useApp();
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [closing, setClosing] = useState(false);

  if (!user || user.settings?.onboarded || closing) return null;
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;
  const first = user.name?.split(' ')[0];

  async function finish() {
    setClosing(true);
    try {
      const d = await api('/api/user', { method: 'PATCH', body: { settings: { onboarded: true } } });
      setUser(d.user);
    } catch {}
  }

  async function allow() {
    try {
      await enablePush();
      toast.success('Notifications are on 🎉');
    } catch (err) {
      toast.error(err.message);
    }
    finish();
  }

  const go = (n) => {
    setDir(n > i ? 1 : -1);
    setI(n);
  };

  return (
    <div className="ob-backdrop">
      <motion.div className="ob-card" initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
        <button className="btn btn-ghost btn-sm ob-skip" onClick={finish}>
          Skip
        </button>
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={slide.key}
            custom={dir}
            initial={{ opacity: 0, x: 40 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 * dir }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="ob-slide"
          >
            <motion.div className="ob-art" initial={{ scale: 0.7, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.05 }}>
              {slide.art}
            </motion.div>
            <h2>{slide.title(first)}</h2>
            <p>{slide.text}</p>
          </motion.div>
        </AnimatePresence>

        <div className="ob-dots" role="tablist" aria-label="Tour steps">
          {SLIDES.map((s, n) => (
            <button key={s.key} className={n === i ? 'on' : ''} onClick={() => go(n)} aria-label={`Step ${n + 1}`} aria-selected={n === i} role="tab" />
          ))}
        </div>

        <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
          {i > 0 && (
            <button className="btn btn-ghost" onClick={() => go(i - 1)}>
              Back
            </button>
          )}
          {!last ? (
            <button className="btn btn-primary btn-lg" onClick={() => go(i + 1)}>
              Next <ArrowRight />
            </button>
          ) : features.push && pushPermission() === 'default' ? (
            <>
              <button className="btn btn-ghost" onClick={finish}>
                Maybe later
              </button>
              <button className="btn btn-primary btn-lg" onClick={allow}>
                <BellRing /> Allow notifications
              </button>
            </>
          ) : (
            <button className="btn btn-primary btn-lg" onClick={finish}>
              Let's go <ArrowRight />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
