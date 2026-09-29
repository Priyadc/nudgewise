import { dayPresets, ymd } from '@/lib/when';

/** Ready-made examples for empty screens. `open` is openSheet from AppContext. */
export function taskExamples(view, open, listId = '') {
  const [today, tomorrow, weekend, nextWeek] = dayPresets().map((d) => d.value);
  const t = (label, defaults) => ({ label, onClick: () => open('task', { list: listId, ...defaults }) });
  if (view === 'today')
    return [
      t('💧 Drink 8 glasses of water', { title: 'Drink 8 glasses of water', date: today }),
      t('📞 Call mom at 7 PM', { title: 'Call mom', date: today, time: '19:00', remind: 'at' }),
      t('🧾 Pay electricity bill', { title: 'Pay electricity bill', date: today, priority: 2 }),
    ];
  if (view === 'upcoming')
    return [
      t('🛒 Weekend grocery run', { title: 'Grocery run', date: weekend, time: '10:00' }),
      t('📚 Finish a course module', { title: 'Finish a course module', date: tomorrow }),
      t('🎂 Plan a birthday surprise', { title: 'Plan a birthday surprise', date: nextWeek, priority: 2 }),
    ];
  return [
    t('📝 Renew bike insurance', { title: 'Renew bike insurance', priority: 3 }),
    t('🏋️ Gym every morning', { title: 'Gym', date: today, time: '07:00', repeat: 'daily' }),
    t('✈️ Book train tickets', { title: 'Book train tickets', date: ymd(new Date(Date.now() + 2 * 864e5)) }),
  ];
}

export function reminderExamples(open) {
  const r = (label, preset) => ({ label, onClick: () => open('reminder', { preset }) });
  return [
    r('💊 Vitamins · 9 AM daily', { title: 'Take vitamins', time: '09:00', repeat: 'daily' }),
    r('💧 Drink water · 11 AM', { title: 'Drink a glass of water', time: '11:00', repeat: 'daily' }),
    r('📞 Call mom · 7 PM weekly', { title: 'Call mom', time: '19:00', repeat: 'weekly' }),
    r('💳 Card bill · monthly', { title: 'Pay credit card bill', time: '10:00', repeat: 'monthly' }),
  ];
}

export function moneyExamples(open) {
  return [
    { label: '💼 Add my salary', onClick: () => open('money', { type: 'income', preset: { note: 'Salary', category: 'Salary', method: 'bank' } }) },
    { label: '🍜 Lunch ₹150', onClick: () => open('money', { type: 'expense', preset: { amount: '150', note: 'Lunch', category: 'Food & Dining' } }) },
    { label: '⛽ Petrol ₹500', onClick: () => open('money', { type: 'expense', preset: { amount: '500', note: 'Petrol', category: 'Fuel' } }) },
    { label: '👥 Split a dinner', onClick: () => open('money', { type: 'expense', split: true, preset: { note: 'Dinner', category: 'Food & Dining' } }) },
  ];
}
