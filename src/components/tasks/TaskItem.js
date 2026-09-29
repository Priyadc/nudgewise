'use client';

import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Bell, CalendarDays, Check, ListChecks, Repeat, Hash } from 'lucide-react';
import { formatTime, relativeDay } from '@/lib/format';
import { Avatar } from '@/components/ui/Controls';

export function TaskCheck({ done, priority = 0, onToggle, label }) {
  return (
    <motion.button
      type="button"
      className={`check p${priority} ${done ? 'checked' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      whileTap={{ scale: 0.8 }}
      aria-pressed={done}
      aria-label={label || (done ? 'Mark as not done' : 'Mark as done')}
    >
      {done && (
        <motion.svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }} />
        </motion.svg>
      )}
    </motion.button>
  );
}

function dueTone(task) {
  if (!task.dueDate || task.done) return '';
  const due = new Date(task.dueDate);
  const now = new Date();
  if (task.hasTime ? due < now : due.setHours(23, 59, 59) < now) return 'chip-danger';
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (new Date(task.dueDate) <= today) return 'chip-accent';
  return '';
}

/** One task in a list. Clicking opens the detail drawer. */
const TaskItem = forwardRef(function TaskItem({ task, onToggle, onOpen, showList = true, readOnly }, ref) {
  const subDone = task.subtasks?.filter((s) => s.done).length || 0;
  const subTotal = task.subtasks?.length || 0;

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
      className={`task-row ${task.done ? 'done' : ''}`}
      onClick={() => onOpen(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(task)}
    >
      {readOnly ? (
        <span className={`check p${task.priority} ${task.done ? 'checked' : ''}`} aria-hidden>
          {task.done && <Check />}
        </span>
      ) : (
        <TaskCheck done={task.done} priority={task.priority} onToggle={() => onToggle(task)} />
      )}
      <div className="grow">
        <div className="task-title">{task.title}</div>
        {task.notes && (
          <p className="small muted truncate" style={{ marginTop: 2 }}>
            {task.notes}
          </p>
        )}
        <div className="task-meta">
          {task.dueDate && (
            <span className={`chip ${dueTone(task)}`}>
              <CalendarDays /> {relativeDay(task.dueDate)}
              {task.hasTime ? ` · ${formatTime(task.dueDate)}` : ''}
            </span>
          )}
          {task.reminderAt && !task.done && (
            <span className="chip" title="Reminder set">
              <Bell />
            </span>
          )}
          {task.repeat && task.repeat !== 'none' && (
            <span className="chip chip-info">
              <Repeat /> {task.repeat}
            </span>
          )}
          {subTotal > 0 && (
            <span className={`chip ${subDone === subTotal ? 'chip-success' : ''}`}>
              <ListChecks /> {subDone}/{subTotal}
            </span>
          )}
          {task.tags?.map((t) => (
            <span key={t} className="chip">
              <Hash /> {t}
            </span>
          ))}
          {showList && task.list && (
            <span className="chip">
              <span className="dot" style={{ background: task.list.color }} /> {task.list.name}
            </span>
          )}
          {task.assignee && (
            <span className="chip" style={{ paddingLeft: 2 }}>
              <Avatar user={task.assignee} size="sm" /> {task.assignee.name?.split(' ')[0]}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default TaskItem;
