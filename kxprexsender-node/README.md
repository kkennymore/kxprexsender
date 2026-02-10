# 📦 kxprexsender (Node.js Backend)

A production-ready Node.js backend package for sending notifications via Web Push, FCM, and Socket.io.

## 🧠 Overview

**kxprexsender-node** provides a single-call notification sender API that routes notifications to all registered devices of a user across multiple transport channels.

### Features

- 🔔 **Multi-transport support**: Web Push, FCM (HTTP v1), Socket.io
- 🎯 **Unified payload format**: Send once, route to all platforms
- 🏷️ **Badge management**: Built-in support for read/unread badge counts
- 🎛️ **Effect control**: Control notification display and badge updates independently
- 🔒 **FCM without Admin SDK**: Uses OAuth 2.0 for authentication
- 📊 **Delivery reporting**: Per-device success/failure tracking

---

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)
- [Backend API Endpoints](#backend-api-endpoints)
- [FAQ](#faq)

---

## 🚀 Installation

```bash
npm install kxprexsender
# or
yarn add kxprexsender
```

### Peer Dependencies

```bash
npm install web-push axios jsonwebtoken socket.io
```

---

## ⚡ Quick Start

### 1. Set up your device store

```typescript
import { KxPrexSender, KxDeviceStore, KxDevice } from 'kxprexsender';

// Example in-memory store (use a real database in production)
class InMemoryDeviceStore implements KxDeviceStore {
  private devices: Map<string, KxDevice[]> = new Map();

  async getUserDevices(userId: string): Promise<KxDevice[]> {
    return this.devices.get(userId) || [];
  }

  async markDeviceInvalid(deviceId: string): Promise<void> {
    // Remove or mark device as invalid
    for (const [userId, devices] of this.devices.entries()) {
      const filtered = devices.filter((d) => d.id !== deviceId);
      this.devices.set(userId, filtered);
    }
  }

  async addDevice(userId: string, device: KxDevice): Promise<void> {
    const userDevices = this.devices.get(userId) || [];
    userDevices.push(device);
    this.devices.set(userId, userDevices);
  }
}
```

### 2. Create the sender

```typescript
import webPush from 'web-push';

const sender = new KxPrexSender({
  webPush: {
    vapidPublicKey: 'YOUR_VAPID_PUBLIC_KEY',
    vapidPrivateKey: 'YOUR_VAPID_PRIVATE_KEY',
    subject: 'mailto:admin@example.com',
  },
  fcm: {
    projectId: 'YOUR_FIREBASE_PROJECT_ID',
    clientEmail: 'firebase-adminsdk@YOUR_PROJECT.iam.gserviceaccount.com',
    privateKey: 'YOUR_SERVICE_ACCOUNT_PRIVATE_KEY',
  },
  store: new InMemoryDeviceStore(),
});
```

### 3. Send notifications

```typescript
const result = await sender.send({
  userId: 'user_123',
  title: 'New Message',
  body: 'You have a new message from John',
  type: 'chat',
  data: { chatId: 'chat_456' },
  badges: { unread: 5, read: 10 },
});

console.log(`Delivered: ${result.delivered}, Failed: ${result.failed}`);
```

---

## ⚙️ Configuration

### KxPrexSenderConfig

```typescript
interface KxPrexSenderConfig {
  // Web Push configuration
  webPush?: {
    vapidPublicKey: string;
    vapidPrivateKey: string;
    subject: string; // mailto: or URL
  };

  // Firebase Cloud Messaging configuration
  fcm?: {
    projectId: string;
    clientEmail: string;
    privateKey: string;
  };

  // Socket.io configuration
  socket?: {
    io: any; // Socket.io server instance
  };

  // Device store (required)
  store: KxDeviceStore;
}
```

### KxDeviceStore Interface

```typescript
interface KxDeviceStore {
  // Get all devices for a user
  getUserDevices(userId: string): Promise<KxDevice[]>;

  // Mark a device as invalid (token expired, etc.)
  markDeviceInvalid(deviceId: string): Promise<void>;
}
```

### KxDevice Model

```typescript
interface KxDevice {
  id: string;
  userId: string;
  platform: 'web' | 'android' | 'ios';
  transport: 'webpush' | 'fcm' | 'socket';
  token?: string;
  webPushSubscription?: any;
  socketRoom?: string;
}
```

---

## 💡 Usage Examples

### Normal Notification with Badge Update

```typescript
await sender.send({
  userId: 'user_123',
  title: 'New Message',
  body: 'You have a new message from John',
  type: 'chat',
  data: { chatId: 'chat_456' },
  badges: { unread: 5, read: 10 },
  effects: {
    notify: true,
    badge: true,
  },
});
```

### Silent Badge Update Only

```typescript
await sender.send({
  userId: 'user_123',
  type: 'sync',
  data: { reason: 'message_read' },
  badges: { unread: 4, read: 11 },
  effects: {
    notify: false,
    badge: true,
  },
});
```

### Notification Without Badge Update

```typescript
await sender.send({
  userId: 'user_123',
  title: 'System Update',
  body: 'App will be updated tonight',
  type: 'admin',
  effects: {
    notify: true,
    badge: false,
  },
});
```

### With Custom TTL and Collapse Key

```typescript
await sender.send({
  userId: 'user_123',
  title: 'New Message',
  body: 'You have a new message',
  type: 'chat',
  data: { chatId: 'chat_456' },
  options: {
    ttl: 86400, // 24 hours in seconds
    collapseKey: 'chat_messages',
  },
});
```

---

## 📚 API Reference

### KxPrexSender.send()

Sends a notification to all devices of a user.

```typescript
interface KxSendOptions {
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
    notify?: boolean;  // default: true
    badge?: boolean;   // default: true
  };
  options?: {
    ttl?: number;
    collapseKey?: string;
  };
}

interface KxSendResult {
  delivered: number;
  failed: number;
  results: {
    deviceId: string;
    transport: string;
    success: boolean;
    error?: string;
  }[];
}
```

**Example:**

```typescript
const result = await sender.send({
  userId: 'user_123',
  title: 'Hello',
  body: 'World',
  type: 'greeting',
});

console.log(result);
// Output:
// {
//   delivered: 3,
//   failed: 0,
//   results: [
//     { deviceId: 'device_1', transport: 'fcm', success: true },
//     { deviceId: 'device_2', transport: 'webpush', success: true },
//     { deviceId: 'device_3', transport: 'socket', success: true }
//   ]
// }
```

---

## 🔌 Backend API Endpoints

Your backend must implement the following endpoints for the Flutter SDK:

### POST /kxprexsender/devices/register

Register a device with the backend.

**Request:**

```json
{
  "platform": "android",
  "transport": "fcm",
  "token": "fcm_push_token",
  "appId": "com.yourcompany.app"
}
```

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {user_token}
```

**Response:** `200 OK` on success

### GET /kxprexsender/badges

Get badge counts for the current user.

**Response:**

```json
{
  "unread": 5,
  "read": 10
}
```

---

## 🎯 Effect Control

Control notification display and badge updates independently:

| notify | badge | Behavior |
|--------|-------|----------|
| `true` | `true` | Normal notification + badge update |
| `false` | `true` | Silent badge-only update |
| `true` | `false` | Notification only, no badge change |
| `false` | `false` | No-op (throws error) |

---

## 🔐 Web Push Setup

### Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

### Output:

```
Public Key: YOUR_VAPID_PUBLIC_KEY
Private Key: YOUR_VAPID_PRIVATE_KEY
```

### Configure Web Push

```typescript
import webPush from 'web-push';

webPush.setVapidDetails(
  'mailto:admin@example.com',
  'YOUR_VAPID_PUBLIC_KEY',
  'YOUR_VAPID_PRIVATE_KEY'
);
```

---

## 🔥 Firebase Setup

### Get Service Account Credentials

1. Go to Firebase Console
2. Select your project
3. Go to Project Settings > Service Accounts
4. Click "Generate new private key"
5. Use the credentials in your config

### Configure FCM

```typescript
const sender = new KxPrexSender({
  fcm: {
    projectId: 'your-project-id',
    clientEmail: 'firebase-adminsdk@your-project.iam.gserviceaccount.com',
    privateKey: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
  },
  store: deviceStore,
});
```

---

## 🧪 Testing

```typescript
// Test sending
const result = await sender.send({
  userId: 'test_user',
  title: 'Test',
  body: 'This is a test',
  type: 'test',
});

console.log('Success rate:', result.delivered / (result.delivered + result.failed) * 100, '%');
```

---

## ❓ FAQ

### Q: Do I need Firebase Admin SDK?

**A:** No! kxprexsender uses OAuth 2.0 JWT authentication directly, avoiding the Firebase Admin SDK dependency.

### Q: How do I handle device registration?

**A:** The package doesn't handle registration - it only sends notifications. You need to implement your own device registration endpoint that saves device info to your database.

### Q: What happens to invalid devices?

**A:** When FCM/WebPush returns 410/404 errors, the SDK automatically calls `markDeviceInvalid` on your store. You should remove these devices from your database.

### Q: Can I use this with other push services?

**A:** Currently, only FCM, Web Push, and Socket.io are supported. Additional transports can be added by implementing the router pattern.

### Q: How do I track delivery analytics?

**A:** The send result includes per-device status. You can log these to your analytics system.

---

## 📦 Related Packages

- [kxprexsender-flutter](link) - Flutter SDK for device-side integration

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

**Package Version:** 1.0.0
