import { supabase } from '../../lib/supabase';
import { useNotificationStore } from '../../store/notificationStore';
import type { Notification, NotificationType } from '../../types/notification.types';

export const notificationService = {
  /** Fetch all notifications for a user */
  fetchNotifications: async (userId: string): Promise<Notification[]> => {
    if (!userId) return [];
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[notificationService.fetchNotifications]', error.message);
        return [];
      }

      return (data || []).map((row) => ({
        id: row.id,
        type: row.type as NotificationType,
        title: row.title,
        body: row.body,
        isRead: row.is_read,
        actionRoute: row.action_route,
        actionParams: row.action_params,
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.warn('[notificationService.fetchNotifications] unexpected:', err);
      return [];
    }
  },

  /** Mark a single notification as read */
  markAsRead: async (notificationId: string): Promise<void> => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
    } catch (err) {
      console.warn('[notificationService.markAsRead] failed:', err);
    }
  },

  /** Mark all notifications as read for a user */
  markAllAsRead: async (userId: string): Promise<void> => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
    } catch (err) {
      console.warn('[notificationService.markAllAsRead] failed:', err);
    }
  },

  /** Delete all notifications for a user */
  clearAll: async (userId: string): Promise<void> => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);
    } catch (err) {
      console.warn('[notificationService.clearAll] failed:', err);
    }
  },

  /** Setup real-time listener for new notifications */
  subscribeToNotifications: (userId: string) => {
    if (!userId) return () => {};

    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new;
          const notification: Notification = {
            id: row.id,
            type: row.type as NotificationType,
            title: row.title,
            body: row.body,
            isRead: row.is_read,
            actionRoute: row.action_route,
            actionParams: row.action_params,
            createdAt: row.created_at,
          };
          
          // Push to global store immediately
          useNotificationStore.getState().addNotification(notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
