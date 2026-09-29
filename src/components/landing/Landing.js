'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bell,
  CircleCheck,
  ChartPie,
  Mic,
  Moon,
  Share2,
  Smartphone,
  Sparkles,
  Wallet,
  Repeat,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import ThemeToggle from '@/components/ui/ThemeToggle';

const FEATURES = [
  { icon: CircleCheck, title: 'Tasks that plan themselves', text: 'Type “Pay rent friday 10am !high” — or just tap Today, 9 AM, High. Lists, checklists and repeats included.' },
  { icon: Bell, title: 'Reminders that actually reach you', text: 'A nudge on your phone, laptop or inbox at the exact minute — even when the app is closed.' },
  { icon: Wallet, title: 'See where every rupee goes', text: '45+ categories, monthly budgets and bill alerts. UPI, cash or credit card — you’ll know what you spent and how.' },
  { icon: UsersRound, title: 'Split bills, stay friends', text: 'Dinner, cabs, trips — split equally or your way. Pockeazy remembers who owes whom, so you don’t have to.' },
  { icon: Mic, title: 'Just say it', text: 'Tap the mic: “spent 250 on Swiggy by credit card”. Done. Works for tasks and reminders too.' },
  { icon: Share2, title: 'Plan together', text: 'Share a grocery or trip list with one link. Everyone sees updates live — no more “did you buy the milk?”' },
  { icon: ChartPie, title: 'Your month at a glance', text: 'Clean, animated charts show your spending, savings rate and how productive your week was.' },
  { icon: Moon, title: 'Looks good, day or night', text: 'Light, dark and your favourite accent colour. Calm by design, never cluttered.' },
  { icon: Smartphone, title: 'An app without the app store', text: 'Add Pockeazy to your home screen on Android, iPhone or desktop — it opens full-screen, like a native app.' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] } }),
};

export default function Landing({ signedIn }) {
  const cta = signedIn ? { href: '/dashboard', label: 'Open your dashboard' } : { href: '/register', label: 'Start free' };

  return (
    <>
      <div className="landing-header">
      <nav className="landing-nav">
        <Link href="/" className="brand" style={{ padding: 0 }}>
          <span className="brand-mark">
            <Logo />
          </span>
          Pockeazy
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
      </div>

      <header className="hero">
        <motion.div initial="hidden" animate="show">
          <motion.div variants={fadeUp} className="eyebrow">
            <b>New</b> Split bills with friends
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1}>
            Your day and your money, <span className="gradient-text">sorted in one pocket.</span>
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="hero-lead">
            Pockeazy remembers what you’d forget — tasks, bills, birthdays — nudges you right on time, and shows where every
            rupee goes. Even who still owes you for dinner.
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
              <ShieldCheck size={16} /> Private to you
            </span>
            <span className="row" style={{ gap: 6 }}>
              <Repeat size={16} /> Phone, tablet & laptop
            </span>
            <span className="row" style={{ gap: 6 }}>
              <Sparkles size={16} /> Free, no ads
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
          <motion.h2 variants={fadeUp}>One app instead of five</motion.h2>
          <motion.p variants={fadeUp} custom={1}>
            Your to-do list, reminder app, expense tracker and bill-splitter — finally talking to each other.
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
          <h2>Give your brain a day off</h2>
          <p style={{ opacity: 0.88, margin: '12px auto 26px', maxWidth: 520 }}>
            Sign up in 30 seconds with email or Google. No card, no clutter — just a calmer you.
          </p>
          <Link href={cta.href} className="btn btn-lg" style={{ background: '#fff', color: '#1e1b4b' }}>
            {cta.label} <ArrowRight />
          </Link>
        </motion.div>
      </section>

      <footer className="footer">
        <span>© {new Date().getFullYear()} Pockeazy · Made with care in India</span>
        <span className="row" style={{ gap: 16 }}>
          <Link href="/login">Sign in</Link>
          <Link href="/register">Create account</Link>
        </span>
      </footer>
    </>
  );
}
