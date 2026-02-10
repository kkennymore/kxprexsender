import { KxUnifiedPayload, KxSendOptions } from '../types';

export class PayloadBuilder {
  build(options: KxSendOptions): KxUnifiedPayload {
    const effects = this.normalizeEffects(options.effects);

    const data: Record<string, string> = {};

    if (options.data) {
      for (const [key, value] of Object.entries(options.data)) {
        data[key] = String(value);
      }
    }

    if (effects.badge) {
      data['kx_badge_enabled'] = 'true';
      if (options.badges) {
        data['kx_badges_unread'] = String(options.badges.unread);
        data['kx_badges_read'] = String(options.badges.read);
      }
    }

    data['type'] = options.type;
    data['kx_notify'] = effects.notify ? 'true' : 'false';

    const payload: KxUnifiedPayload = {
      type: options.type,
      data,
      effects,
    };

    if (effects.notify && options.title && options.body) {
      payload.notification = {
        title: options.title,
        body: options.body,
      };
    }

    if (options.badges) {
      payload.badges = {
        unread: options.badges.unread,
        read: options.badges.read,
      };
    }

    return payload;
  }

  private normalizeEffects(
    effects?: KxSendOptions['effects']
  ): { notify: boolean; badge: boolean } {
    if (!effects) {
      return { notify: true, badge: true };
    }

    return {
      notify: effects.notify ?? true,
      badge: effects.badge ?? true,
    };
  }
}
