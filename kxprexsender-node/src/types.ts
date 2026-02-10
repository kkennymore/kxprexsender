export interface KxPrexSenderConfig {
  webPush?: {
    vapidPublicKey: string;
    vapidPrivateKey: string;
    subject: string;
  };
  fcm?: {
    projectId: string;
    clientEmail: string;
    privateKey: string;
  };
  socket?: {
    io: any;
  };
  store: KxDeviceStore;
}

export interface KxDeviceStore {
  getUserDevices(userId: string): Promise<KxDevice[]>;
  markDeviceInvalid(deviceId: string): Promise<void>;
}

export interface KxDevice {
  id: string;
  userId: string;
  platform: 'web' | 'android' | 'ios';
  transport: 'webpush' | 'fcm' | 'socket';
  token?: string;
  webPushSubscription?: any;
  socketRoom?: string;
}

export interface KxSendOptions {
  userId: string;
  title?: string;
  body?: string;
  type: string;
  data?: Record<string, string>;
  badges?: {
    unread: number;
    read: number;
  };
  effects?: {
    notify?: boolean;
    badge?: boolean;
  };
  options?: {
    ttl?: number;
    collapseKey?: string;
  };
}

export interface KxSendResult {
  delivered: number;
  failed: number;
  results: {
    deviceId: string;
    transport: string;
    success: boolean;
    error?: string;
  }[];
}

export interface KxUnifiedPayload {
  notification?: {
    title: string;
    body: string;
  };
  type: string;
  data: Record<string, string>;
  badges?: {
    unread: number;
    read: number;
  };
  effects: {
    notify: boolean;
    badge: boolean;
  };
}
