import { create } from 'zustand';
import { Notification } from '../types/notification.types';

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

interface NotificationState {
  // ── State ──────────────────────────────────────────────────────────────────

  /** All notifications, newest-first */
  notifications: Notification[];

  /** Count of notifications where isRead === false */
  unreadCount: number;

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Hydrate the store with an initial list of notifications from the DB */
  setNotifications: (notifications: Notification[]) => void;

  /**
   * Prepend a new notification to the top of the list.
   * Increments unreadCount automatically.
   */
  addNotification: (notification: Notification) => void;

  /**
   * Mark a single notification as read by ID.
   * Decrements unreadCount if it was previously unread.
   */
  markRead: (id: string) => void;

  /** Mark every notification as read and reset unreadCount to 0. */
  markAllRead: () => void;

  /** Remove all notifications and reset unreadCount to 0. */
  clearAll: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store implementation
// ─────────────────────────────────────────────────────────────────────────────

const countUnread = (notifications: Notification[]): number =>
  notifications.filter((n) => !n.isRead).length;

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  // ── setNotifications ───────────────────────────────────────────────────────
  setNotifications: (notifications) =>
    set({ notifications, unreadCount: countUnread(notifications) }),

  // ── addNotification ────────────────────────────────────────────────────────
  addNotification: (notification) =>
    set((state) => {
      // Avoid duplicates
      if (state.notifications.some(n => n.id === notification.id)) return state;
      const notifications = [notification, ...state.notifications];
      return {
        notifications,
        unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
      };
    }),

  // ── markRead ───────────────────────────────────────────────────────────────
  markRead: (id) =>
    set((state) => {
      let decremented = false;
      const notifications = state.notifications.map((n) => {
        if (n.id !== id || n.isRead) return n;
        decremented = true;
        return { ...n, isRead: true };
      });
      return {
        notifications,
        unreadCount: decremented
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      };
    }),

  // ── markAllRead ────────────────────────────────────────────────────────────
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),

  // ── clearAll ───────────────────────────────────────────────────────────────
  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));
