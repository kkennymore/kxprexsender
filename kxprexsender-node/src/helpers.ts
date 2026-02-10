// Helper functions for kxprexsender

import { v4 as uuidv4 } from 'crypto';
import { KxDevice, KxSendOptions, KxUnifiedPayload } from './types';

export function generateDeviceId(): string {
  return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function parseFcmToken(fcmToken: string): {
  instanceId: string;
  appId: string;
} {
  // FCM tokens are typically opaque strings
  // This is a placeholder - actual parsing depends on your use case
  return {
    instanceId: fcmToken.substring(0, 32),
    appId: 'unknown',
  };
}

export function validateWebPushSubscription(subscription: any): boolean {
  if (!subscription || typeof subscription !== 'object') {
    return false;
  }

  if (!subscription.endpoint || typeof subscription.endpoint !== 'string') {
    return false;
  }

  if (!subscription.keys || typeof subscription.keys !== 'object') {
    return false;
  }

  if (
    !subscription.keys.p256dh ||
    !subscription.keys.auth
  ) {
    return false;
  }

  return true;
}

export function createDefaultSendOptions(
  userId: string,
  type: string,
  title?: string,
  body?: string
): KxSendOptions {
  return {
    userId,
    title,
    body,
    type,
    data: {},
    badges: {
      unread: 0,
      read: 0,
    },
    effects: {
      notify: true,
      badge: true,
    },
    options: {
      ttl: 86400,
    },
  };
}

export interface BatchSendResult {
  userId: string;
  sent: number;
  failed: number;
  errors: string[];
}

export async function batchSend(
  sendFunction: (options: KxSendOptions) => Promise<any>,
  batches: { userId: string; options: KxSendOptions }[]
): Promise<BatchSendResult[]> {
  const results: BatchSendResult[] = [];

  for (const batch of batches) {
    try {
      const result = await sendFunction(batch.options);
      results.push({
        userId: batch.userId,
        sent: result.delivered,
        failed: result.failed,
        errors: result.results
          .filter((r: any) => !r.success)
          .map((r: any) => `${r.deviceId}: ${r.error}`),
      });
    } catch (error: any) {
      results.push({
        userId: batch.userId,
        sent: 0,
        failed: 0,
        errors: [error.message],
      });
    }
  }

  return results;
}

export function calculateDeliveryRate(
  delivered: number,
  failed: number
): number {
  const total = delivered + failed;
  if (total === 0) return 0;
  return (delivered / total) * 100;
}

export interface DeliveryMetrics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  successRate: number;
  byTransport: {
    webpush: { delivered: number; failed: number };
    fcm: { delivered: number; failed: number };
    socket: { delivered: number; failed: number };
  };
}

export function aggregateMetrics(results: any[]): DeliveryMetrics {
  const metrics: DeliveryMetrics = {
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    successRate: 0,
    byTransport: {
      webpush: { delivered: 0, failed: 0 },
      fcm: { delivered: 0, failed: 0 },
      socket: { delivered: 0, failed: 0 },
    },
  };

  for (const result of results) {
    if (result.results) {
      for (const deviceResult of result.results) {
        metrics.totalSent++;
        metrics.totalDelivered += deviceResult.success ? 1 : 0;
        metrics.totalFailed += deviceResult.success ? 0 : 1;

        if (metrics.byTransport[deviceResult.transport as keyof typeof metrics.byTransport]) {
          if (deviceResult.success) {
            metrics.byTransport[deviceResult.transport as keyof typeof metrics.byTransport].delivered++;
          } else {
            metrics.byTransport[deviceResult.transport as keyof typeof metrics.byTransport].failed++;
          }
        }
      }
    }
  }

  metrics.successRate = calculateDeliveryRate(
    metrics.totalDelivered,
    metrics.totalFailed
  );

  return metrics;
}

export function isValidEffectCombination(
  notify?: boolean,
  badge?: boolean
): boolean {
  const notifyValue = notify ?? true;
  const badgeValue = badge ?? true;

  // Must have at least one effect enabled
  return notifyValue || badgeValue;
}

export function shouldShowNotification(
  effects?: { notify?: boolean; badge?: boolean }
): boolean {
  if (!effects) return true;
  return effects.notify ?? true;
}

export function shouldUpdateBadge(
  effects?: { notify?: boolean; badge?: boolean }
): boolean {
  if (!effects) return true;
  return effects.badge ?? true;
}

export interface NotificationPayload {
  title: string;
  body: string;
  type: string;
  data: Record<string, string>;
  badges?: {
    unread: number;
    read: number;
  };
}

export function createNotificationPayload(
  options: KxSendOptions
): NotificationPayload {
  return {
    title: options.title || '',
    body: options.body || '',
    type: options.type,
    data: options.data || {},
    badges: options.badges,
  };
}
