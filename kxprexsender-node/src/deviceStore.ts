// Example in-memory device store for testing
// In production, use a real database (PostgreSQL, MongoDB, etc.)

import { KxDeviceStore, KxDevice } from './types';

export class InMemoryDeviceStore implements KxDeviceStore {
  private devices: Map<string, Map<string, KxDevice>> = new Map();

  async getUserDevices(userId: string): Promise<KxDevice[]> {
    const userDevices = this.devices.get(userId);
    return userDevices ? Array.from(userDevices.values()) : [];
  }

  async markDeviceInvalid(deviceId: string): Promise<void> {
    for (const [userId, devices] of this.devices.entries()) {
      if (devices.has(deviceId)) {
        devices.delete(deviceId);
        break;
      }
    }
  }

  async addDevice(userId: string, device: KxDevice): Promise<void> {
    if (!this.devices.has(userId)) {
      this.devices.set(userId, new Map());
    }
    this.devices.get(userId)!.set(device.id, device);
  }

  async removeDevice(userId: string, deviceId: string): Promise<boolean> {
    const userDevices = this.devices.get(userId);
    if (!userDevices) return false;
    return userDevices.delete(deviceId);
  }

  async getDevice(deviceId: string): Promise<KxDevice | null> {
    for (const devices of this.devices.values()) {
      if (devices.has(deviceId)) {
        return devices.get(deviceId)!;
      }
    }
    return null;
  }

  async updateDevice(deviceId: string, updates: Partial<KxDevice>): Promise<KxDevice | null> {
    for (const [userId, devices] of this.devices.entries()) {
      if (devices.has(deviceId)) {
        const device = devices.get(deviceId)!;
        const updated = { ...device, ...updates };
        devices.set(deviceId, updated);
        return updated;
      }
    }
    return null;
  }

  async clear(): Promise<void> {
    this.devices.clear();
  }

  async getAllDevices(): Promise<KxDevice[]> {
    const allDevices: KxDevice[] = [];
    for (const devices of this.devices.values()) {
      allDevices.push(...devices.values());
    }
    return allDevices;
  }

  async getDeviceCount(): Promise<number> {
    let count = 0;
    for (const devices of this.devices.values()) {
      count += devices.size;
    }
    return count;
  }
}

// Usage example
async function example() {
  const store = new InMemoryDeviceStore();

  // Add a device
  await store.addDevice('user_123', {
    id: 'device_1',
    userId: 'user_123',
    platform: 'android',
    transport: 'fcm',
    token: 'fcm_token_here',
  });

  // Add another device
  await store.addDevice('user_123', {
    id: 'device_2',
    userId: 'user_123',
    platform: 'web',
    transport: 'webpush',
    webPushSubscription: {
      endpoint: 'https://fcm.googleapis.com/...',
      keys: {
        p256dh: '...',
        auth: '...',
      },
    },
  });

  // Get all devices for user
  const devices = await store.getUserDevices('user_123');
  console.log(`User has ${devices.length} devices`);

  // Update a device token
  await store.updateDevice('device_1', { token: 'new_fcm_token' });
}

export { example };
