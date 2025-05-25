/**
 * Get My Notifications Firebase Function
 * 
 * This function retrieves notifications for the authenticated user.
 * Currently returns an empty array as a placeholder until full notification
 * system is implemented.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NotificationResponse {
  success: boolean;
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

export const getMyNotifications = onCall(
  { 
    cors: true,
    enforceAppCheck: false // Disable for development
  },
  async (request): Promise<NotificationResponse> => {
    try {
      // Verify authentication
      if (!request.auth) {
        logger.warn('getMyNotifications: Unauthenticated request');
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const uid = request.auth.uid;
      const { limit = 50, unreadOnly = false } = request.data || {};

      logger.info('getMyNotifications called', { 
        uid, 
        limit, 
        unreadOnly,
        hasData: !!request.data 
      });

      // Get Firestore instance
      const db = getFirestore();

      try {
        // Query notifications collection for this user
        let query = db.collection('notifications')
          .where('userId', '==', uid)
          .orderBy('createdAt', 'desc');

        if (unreadOnly) {
          query = query.where('isRead', '==', false);
        }

        if (limit > 0) {
          query = query.limit(limit);
        }

        const snapshot = await query.get();
        
        const notifications: Notification[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          notifications.push({
            id: doc.id,
            userId: data.userId || '',
            title: data.title || '',
            message: data.message || '',
            type: data.type || 'info',
            isRead: data.isRead || false,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString()
          });
        });

        // Get total count and unread count
        const totalSnapshot = await db.collection('notifications')
          .where('userId', '==', uid)
          .get();
        
        const unreadSnapshot = await db.collection('notifications')
          .where('userId', '==', uid)
          .where('isRead', '==', false)
          .get();

        const response: NotificationResponse = {
          success: true,
          notifications,
          total: totalSnapshot.size,
          unreadCount: unreadSnapshot.size
        };

        logger.info('getMyNotifications completed', { 
          uid, 
          notificationCount: notifications.length,
          total: response.total,
          unreadCount: response.unreadCount
        });

        return response;

      } catch (firestoreError) {
        logger.error('getMyNotifications: Firestore error', { 
          uid, 
          error: firestoreError 
        });

        // Return empty result instead of throwing error
        return {
          success: true,
          notifications: [],
          total: 0,
          unreadCount: 0
        };
      }

    } catch (error) {
      logger.error('getMyNotifications: Unexpected error', { 
        error,
        uid: request.auth?.uid 
      });

      // For development, return empty result instead of throwing
      if (process.env.NODE_ENV === 'development') {
        return {
          success: true,
          notifications: [],
          total: 0,
          unreadCount: 0
        };
      }

      throw new HttpsError('internal', 'Failed to fetch notifications');
    }
  }
); 