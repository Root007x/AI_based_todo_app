import { Task } from './types';
import { differenceInHours, differenceInDays, parseISO, isValid, isToday, isPast, isTomorrow } from 'date-fns';

export type NotifSeverity = 'critical' | 'warning' | 'info';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  severity: NotifSeverity;
  taskId?: string;
  createdAt: string;
  read: boolean;
}

/**
 * Scan all tasks and produce AppNotification objects for:
 * - Overdue tasks (not done)
 * - Tasks due today (not done)
 * - Tasks due tomorrow that are High priority
 * - Tasks due within 3 days that are High priority
 */
export function buildNotificationsFromTasks(tasks: Task[]): AppNotification[] {
  const now = new Date();
  const notifications: AppNotification[] = [];

  const pending = tasks.filter((t) => t.status !== 'done' && t.due_date);

  for (const task of pending) {
    let due: Date;
    try {
      due = parseISO(task.due_date!);
      if (!isValid(due)) continue;
    } catch {
      continue;
    }
    const hoursLeft = differenceInHours(due, now);
    const daysLeft = differenceInDays(due, now);

    if (isPast(due) && !isToday(due)) {
      // Overdue
      notifications.push({
        id: `overdue-${task.id}`,
        title: '⛔ Overdue Task',
        message: `"${task.title}" was due ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''} ago.`,
        severity: 'critical',
        taskId: task.id,
        createdAt: now.toISOString(),
        read: false,
      });
    } else if (isToday(due)) {
      // Due today
      notifications.push({
        id: `today-${task.id}`,
        title: '🔔 Due Today',
        message: `"${task.title}" is due today${hoursLeft < 3 ? ` in ${hoursLeft}h` : ''}.`,
        severity: task.priority === 'High' ? 'critical' : 'warning',
        taskId: task.id,
        createdAt: now.toISOString(),
        read: false,
      });
    } else if (isTomorrow(due) && task.priority === 'High') {
      // Due tomorrow + high priority
      notifications.push({
        id: `tomorrow-${task.id}`,
        title: '⚠️ Due Tomorrow',
        message: `High-priority task "${task.title}" is due tomorrow.`,
        severity: 'warning',
        taskId: task.id,
        createdAt: now.toISOString(),
        read: false,
      });
    } else if (daysLeft <= 3 && daysLeft > 1 && task.priority === 'High') {
      // Due in 2-3 days + high priority
      notifications.push({
        id: `soon-${task.id}`,
        title: '📅 Coming Up',
        message: `"${task.title}" (High) is due in ${daysLeft} days.`,
        severity: 'info',
        taskId: task.id,
        createdAt: now.toISOString(),
        read: false,
      });
    }
  }

  // Sort: critical first, then warning, then info
  const order: Record<NotifSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return notifications.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** Request browser Notification permission. Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/** Send a browser OS-level push notification */
export function sendBrowserNotification(title: string, body: string, icon?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
    });
  } catch {
    // Some browsers restrict Notification in certain contexts
  }
}
