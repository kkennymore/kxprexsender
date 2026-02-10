import webPush from 'web-push';
import { KxUnifiedPayload } from '../types';

export class WebPushChannel {
  constructor(config: {
    vapidPublicKey: string;
    vapidPrivateKey: string;
    subject: string;
  }) {
    webPush.setVapidDetails(config.subject, config.vapidPublicKey, config.vapidPrivateKey);
  }

  async send(subscription: any, payload: KxUnifiedPayload): Promise<void> {
    const stringPayload = JSON.stringify(payload);
    await webPush.sendNotification(subscription, stringPayload);
  }
}
