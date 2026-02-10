import { KxDevice, KxUnifiedPayload, KxSendOptions, KxDeviceStore } from '../types';
import { WebPushChannel } from '../channels/webpush';
import { FcmChannel } from '../channels/fcm';
import { SocketChannel } from '../channels/socket';
import { PayloadBuilder } from '../core/payloadBuilder';

interface ChannelResult {
  deviceId: string;
  transport: string;
  success: boolean;
  error?: string;
}

export class Router {
  private webPush?: WebPushChannel;
  private fcm?: FcmChannel;
  private socket?: SocketChannel;
  private payloadBuilder: PayloadBuilder;
  private deviceStore: KxDeviceStore;

  constructor(
    deviceStore: KxDeviceStore,
    webPush?: WebPushChannel,
    fcm?: FcmChannel,
    socket?: SocketChannel
  ) {
    this.deviceStore = deviceStore;
    this.webPush = webPush;
    this.fcm = fcm;
    this.socket = socket;
    this.payloadBuilder = new PayloadBuilder();
  }

  async route(options: KxSendOptions): Promise<ChannelResult[]> {
    const devices = await this.deviceStore.getUserDevices(options.userId);

    if (devices.length === 0) {
      return [];
    }

    const payload = this.payloadBuilder.build(options);
    const results: ChannelResult[] = [];

    for (const device of devices) {
      const result = await this.sendToDevice(device, payload);
      results.push(result);

      if (!result.success && this.isInvalidToken(result.error)) {
        await this.deviceStore.markDeviceInvalid(device.id);
      }
    }

    return results;
  }

  private async sendToDevice(
    device: KxDevice,
    payload: KxUnifiedPayload
  ): Promise<ChannelResult> {
    switch (device.transport) {
      case 'webpush':
        return this.sendWebPush(device, payload);
      case 'fcm':
        return this.sendFcm(device, payload);
      case 'socket':
        return this.sendSocket(device, payload);
      default:
        return {
          deviceId: device.id,
          transport: device.transport,
          success: false,
          error: 'Unknown transport type',
        };
    }
  }

  private async sendWebPush(
    device: KxDevice,
    payload: KxUnifiedPayload
  ): Promise<ChannelResult> {
    if (!this.webPush || !device.webPushSubscription) {
      return {
        deviceId: device.id,
        transport: 'webpush',
        success: false,
        error: 'WebPush not configured or device has no subscription',
      };
    }

    try {
      await this.webPush.send(device.webPushSubscription, payload);
      return {
        deviceId: device.id,
        transport: 'webpush',
        success: true,
      };
    } catch (error: any) {
      return {
        deviceId: device.id,
        transport: 'webpush',
        success: false,
        error: error.message,
      };
    }
  }

  private async sendFcm(
    device: KxDevice,
    payload: KxUnifiedPayload
  ): Promise<ChannelResult> {
    if (!this.fcm || !device.token) {
      return {
        deviceId: device.id,
        transport: 'fcm',
        success: false,
        error: 'FCM not configured or device has no token',
      };
    }

    try {
      await this.fcm.send(device.token, payload);
      return {
        deviceId: device.id,
        transport: 'fcm',
        success: true,
      };
    } catch (error: any) {
      return {
        deviceId: device.id,
        transport: 'fcm',
        success: false,
        error: error.message,
      };
    }
  }

  private async sendSocket(
    device: KxDevice,
    payload: KxUnifiedPayload
  ): Promise<ChannelResult> {
    if (!this.socket || !device.socketRoom) {
      return {
        deviceId: device.id,
        transport: 'socket',
        success: false,
        error: 'Socket not configured or device has no room',
      };
    }

    try {
      this.socket.send(device.socketRoom, payload);
      return {
        deviceId: device.id,
        transport: 'socket',
        success: true,
      };
    } catch (error: any) {
      return {
        deviceId: device.id,
        transport: 'socket',
        success: false,
        error: error.message,
      };
    }
  }

  private isInvalidToken(error?: string): boolean {
    if (!error) return false;

    const invalidPatterns = [
      '410',
      '404',
      'UNREGISTERED',
      'INVALID_ARGUMENT',
      'device token not registered',
    ];

    return invalidPatterns.some((pattern) =>
      error.toLowerCase().includes(pattern.toLowerCase())
    );
  }
}
