'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { logout } from '@/lib/client/session';
import { MotionConfig, motion } from 'framer-motion';
import {
  Bell,
  CalendarRange,
  CircleCheck,
  House,
  LayoutDashboard,
  Sun,
  ListTodo,
  LogOut,
  Plus,
  Settings,
  Users,
  Wallet,
  Search,
  WifiOff,
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { Avatar } from '@/components/ui/Controls';
import NotificationBell from './NotificationBell';
import QuickAdd from './QuickAdd';
import Sheets from './Sheets';
import SearchPalette from './SearchPalette';
import Onboarding from './Onboarding';
import Celebration from '@/components/ui/Celebration';
import { emit, flushOutbox, on, outboxCount } from '@/lib/client/api';
import { applyA11y, getA11y } from '@/lib/client/a11y';
import ListModal from '@/components/tasks/ListModal';
import { AppProvider, useApp } from './AppContext';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks?view=today', label: 'My Day', icon: Sun, match: (p, sp) => p === '/tasks' && (sp.get('view') === 'today' || (sp.get('view') === 'completed' && sp.get('from') === 'today')) },
  { href: '/tasks?view=upcoming', label: 'Coming Up', icon: CalendarRange, match: (p, sp) => p === '/tasks' && (sp.get('view') === 'upcoming' || (sp.get('view') === 'completed' && sp.get('from') === 'upcoming')) },
  { href: '/tasks', label: 'All tasks', icon: ListTodo, match: (p, sp) => p === '/tasks' && !sp.get('list') && !['today', 'upcoming'].includes(sp.get('view')) && !['today', 'upcoming'].includes(sp.get('from')) },
  { href: '/reminders', label: 'Reminders', icon: Bell },
  { href: '/finance', label: 'Money', icon: Wallet },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function isActive(item, pathname, sp) {
  if (item.match) return item.match(pathname, sp);
  return pathname === item.href.split('?')[0];
}

function Sidebar() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const { user, lists } = useApp();
  const [newList, setNewList] = useState(false);
  const router = useRouter();

  return (
    <aside className="sidebar">
      <Link href="/dashboard" className="brand">
        <span className="brand-mark">
          <Logo />
        </span>
        Pockeazy
      </Link>

      <nav className="stack" style={{ gap: 2 }} aria-label="Main">
        {NAV.map((item) => {
          const active = isActive(item, pathname, sp);
          return (
            <Link key={item.href} href={item.href} className={`nav-link ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
              {active && <motion.span layoutId="nav-bg" className="nav-bg" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
              <item.icon />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="nav-section">
        My lists
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setNewList(true)} aria-label="New list" style={{ width: 26, height: 26 }}>
          <Plus />
        </button>
      </div>
      <nav className="stack" style={{ gap: 2 }} aria-label="Lists">
        {lists.map((l) => {
          const active = pathname === '/tasks' && sp.get('list') === l._id;
          return (
            <Link key={l._id} href={`/tasks?list=${l._id}`} className={`nav-link ${active ? 'active' : ''}`}>
              {active && <motion.span layoutId="nav-bg" className="nav-bg" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
              <span className="list-emoji">{l.icon}</span>
              <span className="truncate">{l.name}</span>
              {l.shared && <Users size={14} className="faint" style={{ width: 14, height: 14 }} />}
              <span className="nav-count">{l.pending || ''}</span>
            </Link>
          );
        })}
        {lists.length === 0 && <p className="tiny faint" style={{ padding: '4px 12px' }}>No lists yet</p>}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <Avatar user={user} />
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="bold small truncate">{user?.name || '…'}</div>
            <div className="tiny faint truncate">{user?.email}</div>
          </div>
          <ThemeToggle className="btn btn-ghost btn-icon btn-sm" />
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => logout()} aria-label="Sign out" data-tip="Sign out">
            <LogOut />
          </button>
        </div>
      </div>

      <ListModal open={newList} onClose={() => setNewList(false)} onSaved={(l) => router.push(`/tasks?list=${l._id}`)} />
    </aside>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const { openQuickAdd } = useApp();
  const items = [
    { href: '/dashboard', label: 'Home', icon: House },
    { href: '/tasks', label: 'Tasks', icon: CircleCheck },
    null,
    { href: '/reminders', label: 'Remind', icon: Bell },
    { href: '/finance', label: 'Money', icon: Wallet },
  ];
  return (
    <nav className="mobile-nav" aria-label="Mobile">
      {items.map((it, i) =>
        it ? (
          <Link key={it.href} href={it.href} className={pathname.startsWith(it.href) ? 'active' : ''}>
            <it.icon />
            {it.label}
          </Link>
        ) : (
          <button key={i} className="mn-add" onClick={() => openQuickAdd()} aria-label="Add something">
            <Plus />
          </button>
        )
      )}
    </nav>
  );
}

function Topbar() {
  const [scrolled, setScrolled] = useState(false);
  const { user } = useApp();
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  return (
    <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
      <Link href="/dashboard" className="brand show-mobile" style={{ padding: 0, fontSize: 18 }}>
        <span className="brand-mark" style={{ width: 30, height: 30 }}>
          <Logo size={17} />
        </span>
        Pockeazy
      </Link>
      <div className="grow" />
      <OfflinePill />
      <button className="btn btn-ghost btn-icon" onClick={() => emit('open-search')} aria-label="Search (/)" data-tip="Search  /" data-tip-pos="bottom">
        <Search />
      </button>
      <NotificationBell />
      <button className="btn btn-ghost btn-icon" onClick={() => logout()} aria-label="Sign out" data-tip="Sign out" data-tip-pos="bottom">
        <LogOut />
      </button>
      <span className="show-mobile">
        <ThemeToggle />
      </span>
      <Link href="/settings" className="show-mobile" aria-label="Settings">
        <Avatar user={user} />
      </Link>
    </header>
  );
}

function Shortcuts() {
  const { openQuickAdd } = useApp();
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
      if ((e.key === 'n' || e.key === 'N') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        openQuickAdd();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        emit('open-search');
      }
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        emit('open-search');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openQuickAdd]);
  return null;
}

/** "You're offline" pill + sends anything saved offline once we're back */
function OfflinePill() {
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    const goOnline = () => {
      update();
      flushOutbox();
    };
    update();
    setPending(outboxCount());
    flushOutbox();
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', update);
    const off = on('outbox-changed', (n) => setPending(n ?? outboxCount()));
    // Notification buttons (Done / Snooze / Paid) changed something — refresh open pages
    const onSw = (e) => {
      if (e.data?.type === 'pockeazy-refresh') ['tasks-changed', 'money-changed', 'reminders-changed'].forEach((n) => emit(n));
    };
    navigator.serviceWorker?.addEventListener('message', onSw);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', update);
      navigator.serviceWorker?.removeEventListener('message', onSw);
      off();
    };
  }, []);
  if (!offline && !pending) return null;
  return (
    <span className="offline-pill" role="status">
      <WifiOff />
      {offline ? 'Offline' : 'Syncing'}
      {pending > 0 && ` · ${pending} to sync`}
    </span>
  );
}

/** Larger text / high contrast / calm mode from Settings → Display */
function useA11y() {
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    const p = getA11y();
    applyA11y(p);
    setCalm(p.calm);
    return on('a11y-changed', (next) => setCalm(Boolean(next?.calm)));
  }, []);
  return calm;
}

function Fab() {
  const { openQuickAdd } = useApp();
  return (
    <motion.button
      className="fab"
      onClick={() => openQuickAdd()}
      aria-label="Add something (N)"
      title="Add something (N)"
      whileHover={{ scale: 1.06, rotate: 90 }}
      whileTap={{ scale: 0.92 }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
    >
      <Plus />
    </motion.button>
  );
}

export default function AppShell({ children }) {
  const calm = useA11y();
  return (
    <MotionConfig reducedMotion={calm ? 'always' : 'user'}>
    <AppProvider>
      <div className="app-shell">
        <Sidebar />
        <div className="main">
          <Topbar />
          <main className="page">{children}</main>
        </div>
      </div>
      <MobileNav />
      <Fab />
      <QuickAdd />
      <Sheets />
      <Shortcuts />
      <SearchPalette />
      <Onboarding />
      <Celebration />
    </AppProvider>
    </MotionConfig>
  );
}
