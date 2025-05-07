/**
 * Notification Functions
 *
 * Functions for managing user notifications
 */

import type { UserType} from '@/types/enums';
import { NotificationType } from '@/types/enums';
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
import { 
  GetMyNotificationsSchema, 
  MarkNotificationReadSchema, 
  SendDirectMessageSchema 
} from '@/types/schemas';

// Simple in-memory cache for notifications
const notificationsCache: {
  data: Record<string, Notification[]>;
  timestamp: Record<string, number>;
  ttl: number; // Time-to-live in ms
} = {
  data: {},
  timestamp: {},
  ttl: 30000, // Cache notifications for 30 seconds
};

/**
 * Get notifications for the current user
 */
export async function getMyNotifications(
  ctx: { uid: string; role: UserType },
  payload: {} = {}
): Promise<ResultOk<{ notifications: Notification[] }> | ResultErr> {
  const perf = trackPerformance('getMyNotifications');

  try {
    const { uid, role } = ctx;
    logInfo('getMyNotifications called', { uid, role });
    
    // Validate with schema
    const validationResult = GetMyNotificationsSchema.safeParse(payload);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid request: ${validationResult.error.format()}`
      };
    }
    
    // Check cache first
    const now = Date.now();
    const cachedData = notificationsCache.data[uid];
    const cachedTimestamp = notificationsCache.timestamp[uid] || 0;
    
    // If we have cached data that's still valid, use it
    if (cachedData && (now - cachedTimestamp < notificationsCache.ttl)) {
      logInfo('getMyNotifications: Using cached data', { uid, cacheAge: now - cachedTimestamp });
      return { success: true, notifications: cachedData };
    }

    // No valid cache, fetch from database
    const notifications = await getNotifications();

    // Filter notifications for this user
    const userNotifications = notifications.filter(n => n.userId === uid);

    // Sort by date (newest first)
    userNotifications.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Update cache
    notificationsCache.data[uid] = userNotifications;
    notificationsCache.timestamp[uid] = now;

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

    logInfo('markNotificationRead called', { uid, role, ...payload });

    // Validate with schema
    const validationResult = MarkNotificationReadSchema.safeParse(payload);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid request: ${validationResult.error.format()}`
      };
    }

    const { notificationId, isRead = true } = validationResult.data;

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
    
    // Invalidate cache for this user to ensure fresh data next time
    delete notificationsCache.data[uid];
    delete notificationsCache.timestamp[uid];

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

    logInfo('sendDirectMessage called', { uid, role, recipientId: payload.recipientId });

    // Validate with schema
    const validationResult = SendDirectMessageSchema.safeParse(payload);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid request: ${validationResult.error.format()}`
      };
    }

    const { recipientId, message, subject = 'New Message' } = validationResult.data;

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
    
    // Invalidate cache for recipient
    delete notificationsCache.data[recipientId];
    delete notificationsCache.timestamp[recipientId];

    return { success: true };
  } catch (e) {
    logError('sendDirectMessage failed', e);
    return { success: false, error: 'Error sending message' };
  } finally {
    perf.stop();
  }
} 