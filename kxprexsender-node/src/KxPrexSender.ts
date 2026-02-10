import {
  KxPrexSenderConfig,
  KxSendOptions,
  KxSendResult,
  KxDeviceStore,
} from './types';
import { Router } from './core/router';
import { PayloadBuilder } from './core/payloadBuilder';
import { WebPushChannel } from './channels/webpush';
import { FcmChannel } from './channels/fcm';
import { SocketChannel } from './channels/socket';

export class KxPrexSender {
  private router: Router;
  private payloadBuilder: PayloadBuilder;

  constructor(config: KxPrexSenderConfig) {
    this.validateConfig(config);

    const deviceStore: KxDeviceStore = config.store;

    let webPush: WebPushChannel | undefined;
    if (config.webPush) {
      webPush = new WebPushChannel({
        vapidPublicKey: config.webPush.vapidPublicKey,
        vapidPrivateKey: config.webPush.vapidPrivateKey,
        subject: config.webPush.subject,
      });
    }

    let fcm: FcmChannel | undefined;
    if (config.fcm) {
      fcm = new FcmChannel({
        projectId: config.fcm.projectId,
        clientEmail: config.fcm.clientEmail,
        privateKey: config.fcm.privateKey,
      });
    }

    let socket: SocketChannel | undefined;
    if (config.socket) {
      socket = new SocketChannel(config.socket.io);
    }

    this.router = new Router(deviceStore, webPush, fcm, socket);
    this.payloadBuilder = new PayloadBuilder();
  }

  private validateConfig(config: KxPrexSenderConfig): void {
    if (!config.store) {
      throw new Error('Device store is required');
    }

    if (typeof config.store.getUserDevices !== 'function') {
      throw new Error('Device store must have getUserDevices method');
    }

    if (typeof config.store.markDeviceInvalid !== 'function') {
      throw new Error('Device store must have markDeviceInvalid method');
    }
  }

  async send(options: KxSendOptions): Promise<KxSendResult> {
    this.validateSendOptions(options);

    const results = await this.router.route(options);

    const delivered = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      delivered,
      failed,
      results,
    };
  }

  private validateSendOptions(options: KxSendOptions): void {
    if (!options.userId) {
      throw new Error('userId is required');
    }

    if (!options.type) {
      throw new Error('type is required');
    }

    if (options.effects) {
      const { notify, badge } = options.effects;
      if (!notify && !badge) {
        throw new Error('At least one effect (notify or badge) must be enabled');
      }
    }
  }
}
