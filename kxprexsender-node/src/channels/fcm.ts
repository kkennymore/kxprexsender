import axios from 'axios';
import { FcmAuthenticator } from '../auth/fcmAuth';
import { KxUnifiedPayload } from '../types';

interface FcmConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export class FcmChannel {
  private authenticator: FcmAuthenticator;
  private projectId: string;
  private endpoint: string;

  constructor(config: FcmConfig) {
    this.authenticator = new FcmAuthenticator({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: config.privateKey,
    });
    this.projectId = config.projectId;
    this.endpoint = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;
  }

  async send(token: string, payload: KxUnifiedPayload): Promise<void> {
    const accessToken = await this.authenticator.getAccessToken();

    const message: any = {
      token,
      data: this.buildDataPayload(payload),
    };

    if (payload.effects.notify && payload.notification) {
      message.notification = {
        title: payload.notification.title,
        body: payload.notification.body,
      };
    }

    if (payload.effects.badge && payload.badges) {
      message.android = {
        ttl: '3600s',
        notification: {
          default_vibrate_timing: true,
        },
      };

      message.apns = {
        headers: {
          'apns-collapse-id': payload.type,
        },
      };
    }

    if (payload.effects.notify) {
      const ttl = 86400;
      message.android = {
        ...message.android,
        ttl: `${ttl}s`,
        priority: 'high',
      };

      message.apns = {
        ...message.apns,
        payload: {
          aps: {
            content_available: true,
          },
        },
      };
    }

    await axios.post(this.endpoint, { message }, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private buildDataPayload(payload: KxUnifiedPayload): Record<string, string> {
    const data: Record<string, string> = {};

    for (const [key, value] of Object.entries(payload.data)) {
      data[key] = String(value);
    }

    if (payload.effects.badge && payload.badges) {
      data['kx_badges_unread'] = String(payload.badges.unread);
      data['kx_badges_read'] = String(payload.badges.read);
      data['kx_badge_enabled'] = 'true';
    }

    data['kx_notify'] = payload.effects.notify ? 'true' : 'false';
    data['type'] = payload.type;

    return data;
  }
}
