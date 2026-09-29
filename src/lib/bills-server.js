import { nextBillDue } from '@/lib/recurrence';
import Transaction from '@/models/Transaction';

/**
 * Marks the bill's current period as paid and logs the expense.
 * Used by the Bills tab, the "Paid" button on notifications and autopay.
 * `bill` is a Mongoose document.
 */
export async function payBill(bill, { amount, method, now = new Date(), auto = false } = {}) {
  const due = nextBillDue(bill, now);
  if (bill.paidPeriods.includes(due.period)) return { already: true, paidPeriod: due.period };
  bill.paidPeriods.push(due.period);
  if (bill.paidPeriods.length > 36) bill.paidPeriods = bill.paidPeriods.slice(-36);
  await bill.save();

  const transaction = await Transaction.create({
    user: bill.user,
    type: 'expense',
    amount: amount ?? bill.amount,
    category: bill.category || 'Bills & Utilities',
    note: `${bill.name} · ${due.period}`,
    method: method || (auto ? 'bank' : 'upi'),
    date: now,
    bill: bill._id,
  });
  return { transaction, paidPeriod: due.period };
}
