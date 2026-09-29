'use client';

import TaskModal from '@/components/tasks/TaskModal';
import ReminderModal from '@/components/reminders/ReminderModal';
import { TransactionModal } from '@/components/finance/FinanceModals';
import { useApp } from './AppContext';

/** The add/edit sheets, mounted once for the whole app and opened with openSheet(kind, props) */
export default function Sheets() {
  const { sheet, closeSheet, currency } = useApp();
  const p = sheet.props || {};
  return (
    <>
      <TaskModal open={sheet.kind === 'task'} onClose={closeSheet} defaults={p} />
      <ReminderModal open={sheet.kind === 'reminder'} onClose={closeSheet} reminder={p.reminder} preset={p.preset} />
      <TransactionModal open={sheet.kind === 'money'} onClose={closeSheet} txn={p.txn} defaultType={p.type || 'expense'} startSplit={Boolean(p.split)} preset={p.preset} currency={currency} />
    </>
  );
}
