'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Link2, Loader2, Mail, MessageCircle, RefreshCw, Send, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Avatar, Switch } from '@/components/ui/Controls';
import { api, emit } from '@/lib/client/api';

/** Share a list: public join link, email invites, member roles */
export default function ShareDialog({ open, onClose, list, onUpdated }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [busy, setBusy] = useState('');

  if (!list) return null;
  const isOwner = list.role === 'owner';
  const link = list.shareToken && typeof window !== 'undefined' ? `${window.location.origin}/share/${list.shareToken}` : '';

  async function act(body, key, msg) {
    setBusy(key);
    try {
      const d = await api(`/api/lists/${list._id}/share`, { method: 'POST', body });
      onUpdated?.(d.list);
      emit('lists-changed');
      if (msg) toast.success(msg);
      return d.list;
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(link);
    toast.success('Link copied');
  }
  async function nativeShare() {
    const text = `Join my "${list.name}" list on Tickrupee`;
    if (navigator.share) {
      try {
        await navigator.share({ title: list.name, text, url: link });
      } catch {}
    } else copy();
  }

  const people = [{ user: list.owner, role: 'owner' }, ...(list.members || [])].filter((p) => p.user);

  return (
    <Modal open={open} onClose={onClose} title={`Share “${list.name}”`}>
      <div className="stack stack-lg">
        {isOwner ? (
          <>
            <div className="card card-pad" style={{ padding: 16, background: 'var(--surface-2)' }}>
              <div className="row between">
                <div className="row">
                  <span className="stat-icon">
                    <Link2 />
                  </span>
                  <div>
                    <div className="bold">Share with a link</div>
                    <div className="tiny muted">Anyone with the link can join after signing in</div>
                  </div>
                </div>
                <Switch
                  checked={list.shareEnabled}
                  onChange={(v) => act({ action: v ? 'enable' : 'disable', role: list.shareRole }, 'toggle', v ? 'Link sharing on' : 'Link sharing off')}
                  label="Link sharing"
                  disabled={busy === 'toggle'}
                />
              </div>
              <AnimatePresence initial={false}>
                {list.shareEnabled && link && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                    <div className="stack" style={{ paddingTop: 14 }}>
                      <div className="row" style={{ gap: 6 }}>
                        <input className="input" readOnly value={link} onFocus={(e) => e.target.select()} style={{ fontSize: 13 }} />
                        <button className="btn btn-primary btn-icon" onClick={copy} aria-label="Copy link">
                          <Copy />
                        </button>
                      </div>
                      <div className="row row-wrap" style={{ gap: 8 }}>
                        <select className="select" value={list.shareRole} onChange={(e) => act({ action: 'enable', role: e.target.value }, 'role', 'Link permission updated')} style={{ height: 34, width: 'auto', fontSize: 13 }} aria-label="People who join can">
                          <option value="editor">Joiners can edit</option>
                          <option value="viewer">Joiners can only view</option>
                        </select>
                        <button className="btn btn-soft btn-sm" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Join my "${list.name}" list on Tickrupee: ${link}`)}`, '_blank', 'noopener')}>
                          <MessageCircle /> WhatsApp
                        </button>
                        <button className="btn btn-soft btn-sm" onClick={nativeShare}>
                          <Send /> Share
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => act({ action: 'regenerate' }, 'regen', 'New link created — the old one no longer works')} disabled={busy === 'regen'}>
                          <RefreshCw /> Reset link
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <form
              className="field"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await act({ action: 'invite', email, role }, 'invite', `Invite sent to ${email}`)) setEmail('');
              }}
            >
              <label className="label" htmlFor="invite">
                Invite by email
              </label>
              <div className="row" style={{ gap: 6 }}>
                <div className="input-wrap grow">
                  <Mail />
                  <input id="invite" type="email" className="input" placeholder="friend@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <select className="select" value={role} onChange={(e) => setRole(e.target.value)} style={{ width: 110 }} aria-label="Role">
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button className="btn btn-primary" disabled={!email || busy === 'invite'}>
                  {busy === 'invite' ? <Loader2 className="spin" /> : 'Invite'}
                </button>
              </div>
              <span className="hint">If they already use Tickrupee they're added instantly; otherwise they get an email with the join link.</span>
            </form>
          </>
        ) : (
          <p className="muted">
            This list is shared with you by <b>{list.owner?.name || list.owner?.email}</b>. You have <b>{list.role}</b> access.
          </p>
        )}

        <div className="stack stack-sm">
          <span className="label">People with access · {people.length}</span>
          {people.map((p) => (
            <div key={p.user._id} className="row" style={{ padding: '6px 0' }}>
              <Avatar user={p.user} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="bold small truncate">{p.user.name || p.user.email}</div>
                <div className="tiny faint truncate">{p.user.email}</div>
              </div>
              {p.role === 'owner' || !isOwner ? (
                <span className="chip">{p.role}</span>
              ) : (
                <>
                  <select className="select" value={p.role} onChange={(e) => act({ action: 'role', userId: p.user._id, role: e.target.value }, `r-${p.user._id}`)} style={{ height: 32, width: 96, fontSize: 13 }} aria-label="Role">
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => act({ action: 'remove', userId: p.user._id }, `x-${p.user._id}`, 'Removed')} aria-label="Remove member">
                    <UserMinus />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
