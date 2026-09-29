/**
 * Split-bill helpers shared by the API and the UI.
 * Convention: a split transaction's `amount` is MY share of the bill.
 */

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** My share = total minus everyone else's shares */
export function myShareOf(split) {
  if (!split) return 0;
  const others = (split.people || []).reduce((s, p) => s + (Number(p.share) || 0), 0);
  return round2(Math.max(0, split.total - others));
}

/**
 * Equal split between me and `count` other people.
 * Any leftover paisa goes to me, so the shares always add up to the total exactly.
 */
export function equalShares(total, count) {
  const n = count + 1;
  const each = Math.floor((Number(total) * 100) / n) / 100;
  const mine = round2(total - each * count);
  return { each, mine };
}

const key = (name) => String(name || '').trim().toLowerCase();

/**
 * Builds per-person balances from split transactions.
 * Returns { people: [{ name, owesMe, iOwe, net, items }], owedToMe, iOwe }
 *   net > 0 → they owe me, net < 0 → I owe them
 */
export function computeBalances(transactions) {
  const map = new Map();
  const person = (name) => {
    const k = key(name);
    if (!map.has(k)) map.set(k, { name: String(name).trim(), owesMe: 0, iOwe: 0, items: [] });
    return map.get(k);
  };

  for (const t of transactions) {
    const s = t.split;
    if (!s || !s.people?.length) continue;
    const base = { id: String(t._id), date: t.date, note: t.note, category: t.category, total: s.total };
    if (key(s.paidBy) === 'me') {
      for (const p of s.people) {
        const entry = person(p.name);
        if (!p.settled) entry.owesMe += p.share;
        entry.items.push({ ...base, share: p.share, direction: 'owes-me', settled: Boolean(p.settled) });
      }
    } else {
      const payer = person(s.paidBy);
      if (!s.meSettled) payer.iOwe += t.amount;
      payer.items.push({ ...base, share: t.amount, direction: 'i-owe', settled: Boolean(s.meSettled) });
      // Other people in the bill still appear in my contacts, with nothing owed between us
      for (const p of s.people) if (key(p.name) !== key(s.paidBy)) person(p.name);
    }
  }

  const people = [...map.values()]
    .map((p) => ({ ...p, owesMe: round2(p.owesMe), iOwe: round2(p.iOwe), net: round2(p.owesMe - p.iOwe) }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net) || a.name.localeCompare(b.name));

  return {
    people,
    owedToMe: round2(people.reduce((s, p) => s + Math.max(0, p.net), 0)),
    iOwe: round2(people.reduce((s, p) => s + Math.max(0, -p.net), 0)),
  };
}

/** Marks everything between me and `name` as settled. Mutates and returns the changed transactions. */
export function settleWith(transactions, name) {
  const k = key(name);
  const changed = [];
  for (const t of transactions) {
    const s = t.split;
    if (!s) continue;
    let touched = false;
    if (key(s.paidBy) === 'me') {
      for (const p of s.people) {
        if (key(p.name) === k && !p.settled) {
          p.settled = true;
          touched = true;
        }
      }
    } else if (key(s.paidBy) === k && !s.meSettled) {
      s.meSettled = true;
      touched = true;
    }
    if (touched) changed.push(t);
  }
  return changed;
}
