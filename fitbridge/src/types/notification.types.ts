// ─────────────────────────────────────────────────────────────────────────────
// FitBridge Notification Types
// Used by: notificationStore, NotificationScreen, NotificationBell
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Notification type discriminator — drives icon, tint color, and routing.
 *
 *   booking_confirmed  — trainee booked / trainer accepted a session
 *   session_reminder   — upcoming session reminder (15 min / 1 hr / 1 day before)
 *   new_message        — unread chat message in a thread
 *   content_moderated  — FitFeed post flagged or removed by moderation
 *   review_received    — a trainee left a rating/review for a trainer
 *   payout_processed   — trainer earnings payout has been initiated
 *   campaign_approved  — brand campaign approved by FitBridge admin
 *   general            — platform announcements, tips, feature updates
 */
export type NotificationType =
  | 'booking_confirmed'
  | 'session_reminder'
  | 'new_message'
  | 'content_moderated'
  | 'review_received'
  | 'payout_processed'
  | 'campaign_approved'
  | 'general';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;               // ISO timestamp

  /**
   * React Navigation route name to push on tap.
   * Undefined means the notification is informational only (no navigation).
   */
  actionRoute?: string;

  /**
   * Route params to pass when navigating to actionRoute.
   * Keep values serialisable (string | number | boolean).
   */
  actionParams?: Record<string, any>;
}
