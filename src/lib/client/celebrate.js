import { api, emit } from './api';

/** Show the dancing-animal celebration */
export const celebrate = (detail) => emit('celebrate', detail);

/** Once a day: everything in My Day is done */
export async function celebrateDayCleared() {
  const today = new Date().toDateString();
  try {
    if (localStorage.getItem('pockeazy-day-cleared') === today) return;
    localStorage.setItem('pockeazy-day-cleared', today);
  } catch {}
  let streak = null;
  try {
    streak = await api(`/api/streak?tz=${new Date().getTimezoneOffset()}`);
  } catch {}
  celebrate({
    title: 'My Day is all done! 🎉',
    sub: streak?.count > 1 ? `🔥 ${streak.count}-day streak — you're on fire!` : 'Every task for today is ticked off. Enjoy the rest of your day!',
  });
}

/** Is a task part of "My Day" (due today or overdue)? */
export function isMyDay(t) {
  if (!t.dueDate || t.done) return false;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return new Date(t.dueDate) <= end;
}
