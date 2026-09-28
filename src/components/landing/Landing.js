'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bell,
  CircleCheck,
  Camera,
  ChartPie,
  Mic,
  Moon,
  Share2,
  Smartphone,
  Sparkles,
  Wallet,
  Repeat,
  ShieldCheck,
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import ThemeToggle from '@/components/ui/ThemeToggle';

const FEATURES = [
  { icon: CircleCheck, title: 'Smart tasks', text: 'Lists, priorities, subtasks, tags and recurring tasks. Type "Pay rent tomorrow 9am !high" and Orbit fills in the rest.' },
  { icon: Bell, title: 'Reminders that reach you', text: 'Push notifications on your phone and laptop, email reminders and in-app alerts — repeating daily, weekly or monthly.' },
  { icon: Wallet, title: 'Money, sorted', text: 'Track income and expenses by category, set monthly budgets, and never miss a bill with due-date alerts.' },
  { icon: Mic, title: 'Voice to text', text: 'Tap the mic and speak. Add tasks, notes and expenses hands-free — "spent 250 on Swiggy" just works.' },
  { icon: Camera, title: 'Photos & receipts', text: 'Attach pictures to tasks and snap receipts for expenses. Everything stays with the item it belongs to.' },
  { icon: Share2, title: 'Share with friends', text: 'Share a list with one link. Friends can view or edit, and you choose who stays in the loop.' },
  { icon: ChartPie, title: 'Beautiful insights', text: 'Animated charts show where your money goes and how productive your week was.' },
  { icon: Moon, title: 'Light, dark & your colour', text: 'Switch themes instantly and pick an accent colour that feels like yours.' },
  { icon: Smartphone, title: 'Install it like an app', text: 'Add Orbit to your home screen on Android, iPhone or desktop. It opens full-screen, just like a native app.' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] } }),
};

export default function Landing({ signedIn }) {
  const cta = signedIn ? { href: '/dashboard', label: 'Open your dashboard' } : { href: '/register', label: 'Get started — it’s free' };

  return (
    <>
      <nav className="landing-nav glass">
        <Link href="/" className="brand" style={{ padding: 0 }}>
          <span className="brand-mark">
            <Logo />
          </span>
          Orbit
        </Link>
        <div className="row">
          <ThemeToggle />
          {signedIn ? (
            <Link href="/dashboard" className="btn btn-primary">
              Dashboard <ArrowRight />
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost hide-mobile">
                Sign in
              </Link>
              <Link href="/register" className="btn btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>

      <header className="hero">
        <motion.div initial="hidden" animate="show">
          <motion.div variants={fadeUp} className="eyebrow">
            <b>New</b> Voice input & shared lists
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1}>
            Your tasks, reminders <span className="gradient-text">& money</span> — in one orbit.
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="hero-lead">
            Plan your day, get reminded at the right moment, and see exactly where your money goes. Orbit is the calm,
            beautiful home for everything you need to remember.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="row row-wrap">
            <Link href={cta.href} className="btn btn-primary btn-lg">
              {cta.label} <ArrowRight />
            </Link>
            {!signedIn && (
              <Link href="/login" className="btn btn-outline btn-lg">
                I have an account
              </Link>
            )}
          </motion.div>
          <motion.div variants={fadeUp} custom={4} className="row row-wrap muted small" style={{ marginTop: 22, gap: 18 }}>
            <span className="row" style={{ gap: 6 }}>
              <ShieldCheck size={16} /> Secure sign-in
            </span>
            <span className="row" style={{ gap: 6 }}>
              <Repeat size={16} /> Syncs on every device
            </span>
            <span className="row" style={{ gap: 6 }}>
              <Sparkles size={16} /> Free forever
            </span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="orbit-visual"
          aria-hidden
        >
          <div className="orbit-ring" style={{ width: '96%', height: '96%', animationDuration: '38s' }}>
            <span className="planet">
              <Wallet />
            </span>
          </div>
          <div className="orbit-ring" style={{ width: '70%', height: '70%', animationDuration: '26s', animationDirection: 'reverse' }}>
            <span className="planet" style={{ animationDirection: 'normal' }}>
              <Bell />
            </span>
          </div>
          <div className="orbit-ring" style={{ width: '46%', height: '46%', animationDuration: '18s', borderStyle: 'solid', opacity: 0.6 }}>
            <span className="planet" style={{ width: 40, height: 40, marginLeft: -20, top: -20 }}>
              <CircleCheck />
            </span>
          </div>
          <div className="orbit-core" style={{ width: '26%', height: '26%' }}>
            <Logo size={48} />
          </div>
        </motion.div>
      </header>

      <section className="section" id="features">
        <motion.div className="section-head" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }}>
          <motion.h2 variants={fadeUp}>Everything you juggle, finally in one place</motion.h2>
          <motion.p variants={fadeUp} custom={1}>
            We studied the best to-do, reminder and money apps and brought their most-loved features together.
          </motion.p>
        </motion.div>
        <div className="grid grid-3">
          {FEATURES.map((f, i) => (
            <motion.article
              key={f.title}
              className="card feature-card card-hover"
              variants={fadeUp}
              custom={i % 3}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
            >
              <div className="feature-icon">
                <f.icon />
              </div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 20 }}>
        <motion.div
          className="cta-band"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2>Start your first list in under a minute</h2>
          <p style={{ opacity: 0.88, margin: '12px auto 26px', maxWidth: 520 }}>
            Sign up with your email or Google account. No credit card, no clutter.
          </p>
          <Link href={cta.href} className="btn btn-lg" style={{ background: '#fff', color: '#1e1b4b' }}>
            {cta.label} <ArrowRight />
          </Link>
        </motion.div>
      </section>

      <footer className="footer">
        <span>© {new Date().getFullYear()} Orbit. Built with Next.js & MongoDB.</span>
        <span className="row" style={{ gap: 16 }}>
          <Link href="/login">Sign in</Link>
          <Link href="/register">Create account</Link>
        </span>
      </footer>
    </>
  );
}
