/**
 * Notification Functions
 *
 * Functions for managing user notifications
 */

import { UserType, NotificationType } from '@/types/enums';
import { trackPerformance } from '@/lib/performance';
import { logInfo, logError } from '@/lib/logger';
import { 
  getNotifications, 
  saveNotifications,
  getUsers
} from '@/lib/localDb';
import { generateId, nowIso } from '@/lib/localApiCore';
import type { ResultOk, ResultErr } from '@/lib/localApiCore';
import type { Notification } from '@/types/schemas';

/**
 * Get notifications for the current user
 */
export async function getMyNotifications(ctx: {
  uid: string;
  role: UserType;
}): Promise<ResultOk<{ notifications: Notification[] }> | ResultErr> {
  const perf = trackPerformance('getMyNotifications');

  try {
    const { uid, role } = ctx;

    logInfo('getMyNotifications called', { uid, role });

    const notifications = await getNotifications();

    // Filter notifications for this user
    const userNotifications = notifications.filter(n => n.userId === uid);

    // Sort by date (newest first)
    userNotifications.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

    return { success: true, notifications: userNotifications };
  } catch (e) {
    logError('getMyNotifications failed', e);
    return { success: false, error: 'Error fetching notifications' };
  } finally {
    perf.stop();
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(
  ctx: { uid: string; role: UserType },
  payload: {
    notificationId: string;
    isRead?: boolean;
  }
): Promise<ResultOk<{ success: true }> | ResultErr> {
  const perf = trackPerformance('markNotificationRead');

  try {
    const { uid, role } = ctx;
    const { notificationId, isRead = true } = payload;

    logInfo('markNotificationRead called', { uid, role, notificationId, isRead });

    const notifications = await getNotifications();
    const notificationIndex = notifications.findIndex(n => n.id === notificationId);

    if (notificationIndex === -1) {
      logError('Notification not found', { notificationId });
      return { success: false, error: 'Notification not found' };
    }

    // Check if this notification belongs to the user
    if (notifications[notificationIndex].userId !== uid) {
      logError('User not authorized to mark this notification', { uid, notificationId });
      return { success: false, error: 'User not authorized to mark this notification' };
    }

    // Update the notification
    if (notifications[notificationIndex].isRead !== isRead) {
      notifications[notificationIndex].isRead = isRead;
    }

    await saveNotifications(notifications);

    return { success: true };
  } catch (e) {
    logError('markNotificationRead failed', e);
    return { success: false, error: 'Error marking notification as read' };
  } finally {
    perf.stop();
  }
}

/**
 * Send a direct message from one user to another, creating a notification
 */
export async function sendDirectMessage(
  ctx: { uid: string; role: UserType },
  payload: {
    recipientId: string;
    message: string;
    subject?: string;
  }
): Promise<ResultOk<{ success: true }> | ResultErr> {
  const perf = trackPerformance('sendDirectMessage');

  try {
    const { uid, role } = ctx;
    const { recipientId, message, subject = 'New Message' } = payload;

    logInfo('sendDirectMessage called', { uid, role, recipientId });

    // Validate sender exists
    const users = await getUsers();
    const sender = users.find(u => u.id === uid);
    if (!sender) {
      return { success: false, error: 'Sender not found' };
    }

    // Validate recipient exists
    const recipient = users.find(u => u.id === recipientId);
    if (!recipient) {
      return { success: false, error: 'Recipient not found' };
    }

    // Create notification for recipient
    const notifications = await getNotifications();
    const notification: Notification = {
      id: `notif-${generateId()}`,
      userId: recipientId,
      title: subject,
      message: `Message from ${sender.firstName} ${sender.lastName}: ${message}`,
      type: NotificationType.NEW_MESSAGE,
      isRead: false,
      createdAt: nowIso(),
      relatedId: null,
    };
    notifications.push(notification);
    await saveNotifications(notifications);

    return { success: true };
  } catch (e) {
    logError('sendDirectMessage failed', e);
    return { success: false, error: 'Error sending message' };
  } finally {
    perf.stop();
  }
} 