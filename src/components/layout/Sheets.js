'use client';

import { useEffect } from 'react';
import TaskModal from '@/components/tasks/TaskModal';
import ReminderModal from '@/components/reminders/ReminderModal';
import { TransactionModal } from '@/components/finance/FinanceModals';
import { SalaryPlanModal } from '@/components/finance/MoneyPlan';
import { on } from '@/lib/client/api';
import { useApp } from './AppContext';

/** The add/edit sheets, mounted once for the whole app and opened with openSheet(kind, props) */
export default function Sheets() {
  const { sheet, closeSheet, openSheet, currency } = useApp();
  const p = sheet.props || {};

  // Logging a salary opens the salary-day plan (after the money sheet has closed)
  useEffect(() => on('salary-logged', (amount) => setTimeout(() => openSheet('salary', { amount }), 350)), [openSheet]);

  return (
    <>
      <TaskModal open={sheet.kind === 'task'} onClose={closeSheet} defaults={p} />
      <ReminderModal open={sheet.kind === 'reminder'} onClose={closeSheet} reminder={p.reminder} preset={p.preset} />
      <SalaryPlanModal open={sheet.kind === 'salary'} onClose={closeSheet} amount={p.amount} />
      <TransactionModal open={sheet.kind === 'money'} onClose={closeSheet} txn={p.txn} defaultType={p.type || 'expense'} startSplit={Boolean(p.split)} preset={p.preset} currency={currency} />
    </>
  );
}
