import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';

export interface NotificationHistory {
  id: string;
  userId: string;
  type: string;
  title?: string;
  body?: string;
  channels: string[];
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  metadata: Record<string, any>;
  data?: Record<string, string>;
  badges?: {
    unread: number;
    read: number;
  };
  error?: string;
}

export interface CreateHistoryParams {
  userId: string;
  type: string;
  title?: string;
  body?: string;
  channels: string[];
  data?: Record<string, string>;
  badges?: {
    unread: number;
    read: number;
  };
  metadata?: Record<string, any>;
}

export interface QueryParams {
  userId?: string;
  type?: string;
  status?: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface HistoryStore {
  create(params: CreateHistoryParams): Promise<NotificationHistory>;
  getById(id: string): Promise<NotificationHistory | null>;
  getByUserId(userId: string, params?: QueryParams): Promise<{
    notifications: NotificationHistory[];
    total: number;
    page: number;
    limit: number;
  }>;
  updateStatus(
    id: string,
    status: 'sent' | 'delivered' | 'failed' | 'read',
    error?: string
  ): Promise<NotificationHistory | null>;
  delete(id: string): Promise<boolean>;
  deleteByUserId(userId: string): Promise<number>;
  cleanup(olderThan: Date): Promise<number>;
  getStats(userId: string, startDate?: Date, endDate?: Date): Promise<{
    total: number;
    delivered: number;
    failed: number;
    byType: Record<string, number>;
  }>;
}

export class InMemoryHistoryStore implements HistoryStore {
  private store: Map<string, NotificationHistory> = new Map();
  private userIndex: Map<string, Set<string>> = new Map();
  private typeIndex: Map<string, Set<string>> = new Map();
  private readonly logger = Logger.getLogger('InMemoryHistoryStore');

  constructor(private maxEntries: number = 10000) {}

  async create(params: CreateHistoryParams): Promise<NotificationHistory> {
    const notification: NotificationHistory = {
      id: uuidv4(),
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      channels: params.channels,
      status: 'pending',
      createdAt: new Date(),
      metadata: params.metadata || {},
      data: params.data,
      badges: params.badges,
    };

    this.store.set(notification.id, notification);

    if (!this.userIndex.has(params.userId)) {
      this.userIndex.set(params.userId, new Set());
    }
    this.userIndex.get(params.userId)!.add(notification.id);

    if (!this.typeIndex.has(params.type)) {
      this.typeIndex.set(params.type, new Set());
    }
    this.typeIndex.get(params.type)!.add(notification.id);

    if (this.store.size > this.maxEntries) {
      const oldest = this.store.values().next().value;
      if (oldest) {
        this.delete(oldest.id);
      }
    }

    return notification;
  }

  async getById(id: string): Promise<NotificationHistory | null> {
    return this.store.get(id) || null;
  }

  async getByUserId(
    userId: string,
    params: QueryParams = {}
  ): Promise<{
    notifications: NotificationHistory[];
    total: number;
    page: number;
    limit: number;
  }> {
    const userNotifications = this.userIndex.get(userId);
    if (!userNotifications) {
      return { notifications: [], total: 0, page: 1, limit: 20 };
    }

    let notifications = Array.from(userNotifications)
      .map((id) => this.store.get(id)!)
      .filter((n) => n !== undefined);

    if (params.type) {
      notifications = notifications.filter((n) => n.type === params.type);
    }

    if (params.status) {
      notifications = notifications.filter((n) => n.status === params.status);
    }

    if (params.startDate) {
      notifications = notifications.filter(
        (n) => n.createdAt >= params.startDate!
      );
    }

    if (params.endDate) {
      notifications = notifications.filter(
        (n) => n.createdAt <= params.endDate!
      );
    }

    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const page = params.page || 1;
    const limit = params.limit || 20;
    const start = (page - 1) * limit;
    const paginated = notifications.slice(start, start + limit);

    return {
      notifications: paginated,
      total: notifications.length,
      page,
      limit,
    };
  }

  async updateStatus(
    id: string,
    status: 'sent' | 'delivered' | 'failed' | 'read',
    error?: string
  ): Promise<NotificationHistory | null> {
    const notification = this.store.get(id);
    if (!notification) return null;

    notification.status = status;
    notification.error = error;

    switch (status) {
      case 'sent':
        notification.sentAt = new Date();
        break;
      case 'delivered':
        notification.deliveredAt = new Date();
        break;
      case 'read':
        notification.readAt = new Date();
        break;
    }

    return notification;
  }

  async delete(id: string): Promise<boolean> {
    const notification = this.store.get(id);
    if (!notification) return false;

    this.store.delete(id);
    this.userIndex.get(notification.userId)?.delete(id);
    this.typeIndex.get(notification.type)?.delete(id);

    return true;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const userNotifications = this.userIndex.get(userId);
    if (!userNotifications) return 0;

    let deleted = 0;
    for (const id of userNotifications) {
      if (this.store.delete(id)) {
        deleted++;
      }
    }
    this.userIndex.delete(userId);

    return deleted;
  }

  async cleanup(olderThan: Date): Promise<number> {
    let deleted = 0;
    for (const [id, notification] of this.store.entries()) {
      if (notification.createdAt < olderThan) {
        this.store.delete(id);
        this.userIndex.get(notification.userId)?.delete(id);
        this.typeIndex.get(notification.type)?.delete(id);
        deleted++;
      }
    }
    return deleted;
  }

  async getStats(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total: number;
    delivered: number;
    failed: number;
    byType: Record<string, number>;
  }> {
    const userNotifications = this.userIndex.get(userId);
    if (!userNotifications) {
      return { total: 0, delivered: 0, failed: 0, byType: {} };
    }

    let notifications = Array.from(userNotifications)
      .map((id) => this.store.get(id)!)
      .filter((n) => n !== undefined);

    if (startDate) {
      notifications = notifications.filter((n) => n.createdAt >= startDate);
    }

    if (endDate) {
      notifications = notifications.filter((n) => n.createdAt <= endDate);
    }

    let delivered = 0;
    let failed = 0;
    const byType: Record<string, number> = {};

    for (const n of notifications) {
      if (n.status === 'delivered' || n.status === 'read') {
        delivered++;
      }
      if (n.status === 'failed') {
        failed++;
      }
      byType[n.type] = (byType[n.type] || 0) + 1;
    }

    return {
      total: notifications.length,
      delivered,
      failed,
      byType,
    };
  }
}

export const createHistoryStore = (maxEntries?: number): HistoryStore => {
  return new InMemoryHistoryStore(maxEntries);
};
