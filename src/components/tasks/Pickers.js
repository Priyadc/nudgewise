'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CalendarDays, CalendarPlus, Clock, Flag, FolderOpen, Moon, Repeat, Sun, Sunrise, Sunset } from 'lucide-react';
import { ChipGroup, PickLabel } from '@/components/ui/Chips';
import { dayPresets, TIME_PRESETS, remindOptions } from '@/lib/when';

const TIME_ICONS = { '09:00': Sunrise, '13:00': Sun, '18:00': Sunset, '21:00': Moon };

const reveal = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
  style: { overflow: 'hidden' },
};

/**
 * Day + time chips.
 *   date: 'YYYY-MM-DD' | ''   time: 'HH:MM' | ''
 *   onChange({ date, time })
 */
export function WhenPicker({ date, time, onChange, allowNoDate = true, allowNoTime = true, disabled, dayLabel = 'When', timeLabel = 'What time' }) {
  const presets = useMemo(() => dayPresets(), []);
  const [pickingDay, setPickingDay] = useState(false);
  const [pickingTime, setPickingTime] = useState(false);
  const isPreset = presets.some((p) => p.value === date);
  const dayValue = !date ? '' : isPreset && !pickingDay ? date : 'pick';
  const isTimePreset = TIME_PRESETS.some((t) => t.value === time);
  const timeValue = !time ? '' : isTimePreset && !pickingTime ? time : 'pick';

  const dayOptions = [
    ...(allowNoDate ? [{ value: '', label: 'No date' }] : []),
    ...presets,
    { value: 'pick', label: 'Pick a date', icon: CalendarPlus },
  ];
  const timeOptions = [
    ...(allowNoTime ? [{ value: '', label: 'Any time' }] : []),
    ...TIME_PRESETS.map((t) => ({ value: t.value, label: t.label, icon: TIME_ICONS[t.value], title: t.part })),
    { value: 'pick', label: 'Pick a time', icon: Clock },
  ];

  function pickDay(v) {
    setPickingDay(v === 'pick');
    if (v === 'pick') return onChange({ date: date || presets[0].value, time: time || (allowNoTime ? '' : '09:00') });
    onChange({ date: v, time: v ? time || (allowNoTime ? '' : '09:00') : '' });
  }
  function pickTime(v) {
    setPickingTime(v === 'pick');
    if (v === 'pick') return onChange({ date, time: time || '10:00' });
    onChange({ date, time: v });
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div>
        <PickLabel icon={CalendarDays}>{dayLabel}</PickLabel>
        <ChipGroup options={dayOptions} value={dayValue} onChange={pickDay} disabled={disabled} ariaLabel={dayLabel} />
        <AnimatePresence initial={false}>
          {dayValue === 'pick' && (
            <motion.div {...reveal}>
              <input type="date" className="input" value={date} onChange={(e) => onChange({ date: e.target.value, time })} style={{ marginTop: 8, maxWidth: 220 }} disabled={disabled} aria-label="Date" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence initial={false}>
        {date && (
          <motion.div {...reveal}>
            <PickLabel icon={Clock}>{timeLabel}</PickLabel>
            <ChipGroup options={timeOptions} value={timeValue} onChange={pickTime} disabled={disabled} ariaLabel={timeLabel} />
            {timeValue === 'pick' && (
              <input type="time" className="input" value={time} onChange={(e) => onChange({ date, time: e.target.value })} style={{ marginTop: 8, maxWidth: 160 }} disabled={disabled} aria-label="Time" />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Reminder chips for a task — options adapt to whether the task has a date and a time */
export function RemindPicker({ date, time, remind, custom, onChange, disabled }) {
  const options = remindOptions(date, time);
  const value = options.some((o) => o.value === remind) ? remind : 'none';
  return (
    <div>
      <PickLabel icon={Bell}>Remind me</PickLabel>
      <ChipGroup options={options} value={value} onChange={(v) => onChange({ remind: v, custom })} disabled={disabled} ariaLabel="Remind me" />
      <AnimatePresence initial={false}>
        {value === 'custom' && (
          <motion.div {...reveal}>
            <input type="datetime-local" className="input" value={custom} onChange={(e) => onChange({ remind: 'custom', custom: e.target.value })} style={{ marginTop: 8, maxWidth: 260 }} disabled={disabled} aria-label="Reminder time" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const PRIORITY_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Low', icon: Flag, color: 'var(--info)' },
  { value: 2, label: 'Medium', icon: Flag, color: 'var(--warning)' },
  { value: 3, label: 'High', icon: Flag, color: 'var(--danger)' },
];

export function PriorityPicker({ value, onChange, disabled }) {
  return (
    <div>
      <PickLabel icon={Flag}>How important?</PickLabel>
      <ChipGroup options={PRIORITY_OPTIONS} value={value} onChange={onChange} disabled={disabled} ariaLabel="Priority" />
    </div>
  );
}

export const REPEAT_OPTIONS = [
  { value: 'none', label: 'Just once' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
  { value: 'yearly', label: 'Every year' },
];

export function RepeatPicker({ value, onChange, disabled, label = 'Repeat' }) {
  return (
    <div>
      <PickLabel icon={Repeat}>{label}</PickLabel>
      <ChipGroup options={REPEAT_OPTIONS} value={value || 'none'} onChange={onChange} disabled={disabled} ariaLabel={label} />
    </div>
  );
}

/** Lists as chips (emoji + name). `lists` should already exclude view-only lists. */
export function ListPicker({ lists, value, onChange, disabled }) {
  const options = [{ value: '', label: 'No list' }, ...lists.map((l) => ({ value: l._id, label: `${l.icon} ${l.name}` }))];
  return (
    <div>
      <PickLabel icon={FolderOpen}>Which list?</PickLabel>
      <ChipGroup options={options} value={value || ''} onChange={onChange} disabled={disabled} ariaLabel="List" />
    </div>
  );
}
