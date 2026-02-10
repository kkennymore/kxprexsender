// MongoDB device store implementation
// Install: npm install mongodb

import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { KxDeviceStore, KxDevice } from './types';

interface MongoDevice {
  _id?: ObjectId;
  id: string;
  userId: string;
  platform: 'web' | 'android' | 'ios';
  transport: 'webpush' | 'fcm' | 'socket';
  token?: string;
  webPushSubscription?: any;
  socketRoom?: string;
  createdAt: Date;
  updatedAt: Date;
  isValid: boolean;
}

export class MongoDeviceStore implements KxDeviceStore {
  private client: MongoClient;
  private db: Db;
  private collection: Collection<MongoDevice>;

  constructor(connectionString: string, databaseName: string = 'kxprexsender') {
    this.client = new MongoClient(connectionString);
    this.db = this.client.db(databaseName);
    this.collection = this.db.collection('devices');
  }

  async connect(): Promise<void> {
    await this.client.connect();
    await this.collection.createIndex({ userId: 1 });
    await this.collection.createIndex({ id: 1 }, { unique: true });
    await this.collection.createIndex({ 'webPushSubscription.endpoint': 1 });
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  async getUserDevices(userId: string): Promise<KxDevice[]> {
    const devices = await this.collection.find({
      userId,
      isValid: true,
    }).toArray();

    return devices.map((d) => this.toDevice(d));
  }

  async markDeviceInvalid(deviceId: string): Promise<void> {
    await this.collection.updateOne(
      { id: deviceId },
      {
        $set: {
          isValid: false,
          updatedAt: new Date(),
        },
      }
    );
  }

  async addDevice(userId: string, device: KxDevice): Promise<void> {
    const mongoDevice: MongoDevice = {
      id: device.id,
      userId,
      platform: device.platform,
      transport: device.transport,
      token: device.token,
      webPushSubscription: device.webPushSubscription,
      socketRoom: device.socketRoom,
      createdAt: new Date(),
      updatedAt: new Date(),
      isValid: true,
    };

    await this.collection.updateOne(
      { id: device.id },
      { $set: mongoDevice },
      { upsert: true }
    );
  }

  async removeDevice(userId: string, deviceId: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ id: deviceId, userId });
    return result.deletedCount > 0;
  }

  async getDevice(deviceId: string): Promise<KxDevice | null> {
    const device = await this.collection.findOne({ id: deviceId });
    return device ? this.toDevice(device) : null;
  }

  async updateDevice(
    deviceId: string,
    updates: Partial<KxDevice>
  ): Promise<KxDevice | null> {
    const updateDoc: any = { updatedAt: new Date() };

    if (updates.token !== undefined) updateDoc.token = updates.token;
    if (updates.webPushSubscription !== undefined)
      updateDoc.webPushSubscription = updates.webPushSubscription;
    if (updates.socketRoom !== undefined) updateDoc.socketRoom = updates.socketRoom;
    if (updates.transport !== undefined) updateDoc.transport = updates.transport;

    const result = await this.collection.findOneAndUpdate(
      { id: deviceId },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    return result ? this.toDevice(result) : null;
  }

  async clear(): Promise<void> {
    await this.collection.deleteMany({});
  }

  async getAllDevices(): Promise<KxDevice[]> {
    const devices = await this.collection.find({ isValid: true }).toArray();
    return devices.map((d) => this.toDevice(d));
  }

  async getDeviceCount(): Promise<number> {
    return this.collection.countDocuments({ isValid: true });
  }

  async getInvalidDevices(): Promise<KxDevice[]> {
    const devices = await this.collection.find({ isValid: false }).toArray();
    return devices.map((d) => this.toDevice(d));
  }

  async cleanupInvalidDevices(olderThan: Date): Promise<number> {
    const result = await this.collection.deleteMany({
      isValid: false,
      updatedAt: { $lt: olderThan },
    });
    return result.deletedCount;
  }

  private toDevice(mongoDevice: MongoDevice): KxDevice {
    return {
      id: mongoDevice.id,
      userId: mongoDevice.userId,
      platform: mongoDevice.platform,
      transport: mongoDevice.transport,
      token: mongoDevice.token,
      webPushSubscription: mongoDevice.webPushSubscription,
      socketRoom: mongoDevice.socketRoom,
    };
  }
}

// Usage example
async function example() {
  const store = new MongoDeviceStore(
    process.env.MONGODB_URI || 'mongodb://localhost:27017'
  );

  await store.connect();

  // Add a device
  await store.addDevice('user_123', {
    id: 'device_android_1',
    userId: 'user_123',
    platform: 'android',
    transport: 'fcm',
    token: 'fcm_push_token',
  });

  // Get user devices
  const devices = await store.getUserDevices('user_123');
  console.log(`Found ${devices.length} devices`);

  await store.disconnect();
}

export { example };
