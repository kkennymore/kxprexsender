// PostgreSQL/Supabase device store implementation
// Install: npm install pg

import { Pool, PoolClient, QueryResult } from 'pg';
import { KxDeviceStore, KxDevice } from './types';

interface PostgresDevice {
  id: string;
  user_id: string;
  platform: string;
  transport: string;
  token: string | null;
  web_push_subscription: any;
  socket_room: string | null;
  created_at: Date;
  updated_at: Date;
  is_valid: boolean;
}

export class PostgresDeviceStore implements KxDeviceStore {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async connect(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS kxprex_devices (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          platform VARCHAR(50) NOT NULL,
          transport VARCHAR(50) NOT NULL,
          token TEXT,
          web_push_subscription JSONB,
          socket_room VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          is_valid BOOLEAN DEFAULT TRUE
        )
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_kxprex_devices_user_id ON kxprex_devices(user_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_kxprex_devices_is_valid ON kxprex_devices(is_valid)`);
    } finally {
      client.release();
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  async getUserDevices(userId: string): Promise<KxDevice[]> {
    const result = await this.pool.query(
      `SELECT * FROM kxprex_devices WHERE user_id = $1 AND is_valid = TRUE`,
      [userId]
    );
    return result.rows.map((row) => this.toDevice(row));
  }

  async markDeviceInvalid(deviceId: string): Promise<void> {
    await this.pool.query(
      `UPDATE kxprex_devices SET is_valid = FALSE, updated_at = NOW() WHERE id = $1`,
      [deviceId]
    );
  }

  async addDevice(userId: string, device: KxDevice): Promise<void> {
    await this.pool.query(
      `INSERT INTO kxprex_devices (id, user_id, platform, transport, token, web_push_subscription, socket_room)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         token = EXCLUDED.token,
         web_push_subscription = EXCLUDED.web_push_subscription,
         socket_room = EXCLUDED.socket_room,
         updated_at = NOW()`,
      [
        device.id,
        userId,
        device.platform,
        device.transport,
        device.token || null,
        device.webPushSubscription ? JSON.stringify(device.webPushSubscription) : null,
        device.socketRoom || null,
      ]
    );
  }

  async removeDevice(userId: string, deviceId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM kxprex_devices WHERE id = $1 AND user_id = $2`,
      [deviceId, userId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getDevice(deviceId: string): Promise<KxDevice | null> {
    const result = await this.pool.query(
      `SELECT * FROM kxprex_devices WHERE id = $1`,
      [deviceId]
    );
    if (result.rows.length === 0) return null;
    return this.toDevice(result.rows[0]);
  }

  async updateDevice(
    deviceId: string,
    updates: Partial<KxDevice>
  ): Promise<KxDevice | null> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.token !== undefined) {
      setClauses.push(`token = $${paramIndex++}`);
      values.push(updates.token);
    }
    if (updates.webPushSubscription !== undefined) {
      setClauses.push(`web_push_subscription = $${paramIndex++}`);
      values.push(JSON.stringify(updates.webPushSubscription));
    }
    if (updates.socketRoom !== undefined) {
      setClauses.push(`socket_room = $${paramIndex++}`);
      values.push(updates.socketRoom);
    }
    if (updates.transport !== undefined) {
      setClauses.push(`transport = $${paramIndex++}`);
      values.push(updates.transport);
    }

    values.push(deviceId);

    const result = await this.pool.query(
      `UPDATE kxprex_devices SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.toDevice(result.rows[0]);
  }

  async clear(): Promise<void> {
    await this.pool.query(`DELETE FROM kxprex_devices`);
  }

  async getAllDevices(): Promise<KxDevice[]> {
    const result = await this.pool.query(
      `SELECT * FROM kxprex_devices WHERE is_valid = TRUE`
    );
    return result.rows.map((row) => this.toDevice(row));
  }

  async getDeviceCount(): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*) as count FROM kxprex_devices WHERE is_valid = TRUE`
    );
    return parseInt(result.rows[0].count, 10);
  }

  async getInvalidDevices(): Promise<KxDevice[]> {
    const result = await this.pool.query(
      `SELECT * FROM kxprex_devices WHERE is_valid = FALSE`
    );
    return result.rows.map((row) => this.toDevice(row));
  }

  async cleanupInvalidDevices(olderThan: Date): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM kxprex_devices WHERE is_valid = FALSE AND updated_at < $1`,
      [olderThan]
    );
    return result.rowCount || 0;
  }

  private toDevice(row: PostgresDevice): KxDevice {
    return {
      id: row.id,
      userId: row.user_id,
      platform: row.platform as 'web' | 'android' | 'ios',
      transport: row.transport as 'webpush' | 'fcm' | 'socket',
      token: row.token || undefined,
      webPushSubscription: row.web_push_subscription || undefined,
      socketRoom: row.socket_room || undefined,
    };
  }
}

// Usage example
async function example() {
  const store = new PostgresDeviceStore(
    process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/kxprexsender'
  );

  await store.connect();

  // Add a device
  await store.addDevice('user_123', {
    id: 'device_ios_1',
    userId: 'user_123',
    platform: 'ios',
    transport: 'fcm',
    token: 'fcm_token_ios',
  });

  const devices = await store.getUserDevices('user_123');
  console.log(`Found ${devices.length} devices`);

  await store.disconnect();
}

export { example };
