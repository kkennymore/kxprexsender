# 📦 kxprexsender

A complete notification system with backend (Node.js) and Flutter SDK support.

## 🧠 Overview

**kxprexsender** provides a unified notification delivery system with:

- 🔔 **Backend (Node.js)**: Multi-transport notification router (Web Push, FCM, Socket.io)
- 📱 **Flutter SDK**: Single-call device SDK for push notifications and badge management
- 🏷️ **Badge System**: Real-time read/unread badge synchronization
- 🎛️ **Effect Control**: Independent notification and badge update control

---

## 📁 Project Structure

```
kxprexsender/
├── kxprexsender-node/          # Backend npm package
│   ├── src/
│   │   ├── index.ts           # Main entry
│   │   ├── KxPrexSender.ts    # Main class
│   │   ├── types.ts           # TypeScript types
│   │   ├── core/
│   │   │   ├── router.ts      # Notification routing
│   │   │   └── payloadBuilder.ts
│   │   ├── channels/
│   │   │   ├── webpush.ts     # Web Push transport
│   │   │   ├── fcm.ts         # FCM HTTP v1 transport
│   │   │   └── socket.ts      # Socket.io transport
│   │   └── auth/
│   │       └── fcmAuth.ts     # FCM OAuth authentication
│   ├── package.json
│   └── README.md
│
└── kxprexsender-flutter/      # Flutter SDK (coming soon)
    └── lib/
        └── kxprexsender.dart
```

---

## 🎯 Features

### Backend (kxprexsender-node)

- ✅ Multi-transport routing (Web Push, FCM, Socket.io)
- ✅ Badge count management (read/unread)
- ✅ Effect control (notify vs badge-only updates)
- ✅ Per-device delivery reporting
- ✅ No Firebase Admin SDK dependency
- ✅ JWT-based FCM authentication

### Flutter SDK (kxprexsender-flutter)

- ✅ Single-call initialization
- ✅ Automatic device registration
- ✅ Foreground/background message handling
- ✅ Real-time badge synchronization
- ✅ Custom authentication headers
- ✅ Token refresh handling

---

## 🚀 Quick Start

### Backend (Node.js)

```bash
cd kxprexsender-node
npm install
```

**Usage:**

```typescript
import { KxPrexSender } from 'kxprexsender';

const sender = new KxPrexSender({
  fcm: {
    projectId: 'your-project-id',
    clientEmail: 'firebase-adminsdk@your-project.iam.gserviceaccount.com',
    privateKey: 'your-private-key',
  },
  webPush: {
    vapidPublicKey: 'your-vapid-public-key',
    vapidPrivateKey: 'your-vapid-private-key',
    subject: 'mailto:admin@example.com',
  },
  store: yourDeviceStore,
});

// Send notification
await sender.send({
  userId: 'user_123',
  title: 'New Message',
  body: 'You have a new message',
  type: 'chat',
  data: { chatId: 'chat_456' },
  badges: { unread: 5, read: 10 },
});
```

### Flutter SDK

```yaml
# pubspec.yaml
dependencies:
  kxprexsender: ^1.0.0
```

**Usage:**

```dart
import 'package:kxprexsender/kxprexsender.dart';

void main() async {
  await KxPrexSender.initialize(
    KxPrexSenderConfig(
      backendUrl: 'https://api.example.com',
      appId: 'com.example.app',
    ),
  );

  KxPrexSender.onMessage((notification) {
    print('${notification.title}: ${notification.body}');
  });
}
```

---

## 📖 Documentation

- [Backend README](kxprexsender-node/README.md)
- [Flutter SDK README](kxprexsender-flutter/README.md)
- [Flutter Usage Guide](kxprexsender-flutter/EXAMPLE_USAGE.md)

---

## 🎛️ Effect Control

Send different types of notifications:

### Normal Notification + Badge Update

```typescript
await sender.send({
  userId: 'user_123',
  title: 'New Message',
  body: 'You have a new message',
  type: 'chat',
  badges: { unread: 5, read: 10 },
  effects: { notify: true, badge: true },
});
```

### Silent Badge Update Only

```typescript
await sender.send({
  userId: 'user_123',
  type: 'sync',
  badges: { unread: 4, read: 11 },
  effects: { notify: false, badge: true },
});
```

### Notification Only (No Badge Change)

```typescript
await sender.send({
  userId: 'user_123',
  title: 'System Update',
  body: 'App will be updated tonight',
  type: 'admin',
  effects: { notify: true, badge: false },
});
```

---

## 🔧 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Backend API                              │
├─────────────────────────────────────────────────────────────┤
│                   kxprexsender (Node.js)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Router    │  │   Payload   │  │   Device Store      │ │
│  │             │  │   Builder   │  │   (Interface)       │ │
│  └──────┬──────┘  └─────────────┘  └─────────────────────┘ │
│         │                                                    │
│  ┌──────┴─────────────────────────────────────────────────┐ │
│  │                    Channels                             │ │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────────┐   │ │
│  │  │ Web Push │  │   FCM    │  │     Socket.io       │   │ │
│  │  └──────────┘  └──────────┘  └────────────────────┘   │ │
│  └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                   Firebase Cloud Messaging                   │
├─────────────────────────────────────────────────────────────┤
│                  Flutter Mobile Apps                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              kxprexsender (Flutter SDK)             │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────┐│   │
│  │  │  FCM       │  │   Badge    │  │  Registration  ││   │
│  │  │  Adapter   │  │   Store    │  │  & API         ││   │
│  │  └────────────┘  └────────────┘  └────────────────┘│   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Supported Platforms

| Platform | Transport | Backend | Flutter SDK |
|----------|-----------|---------|-------------|
| Web | Web Push | ✅ | ❌ |
| Android | FCM | ✅ | ✅ |
| iOS | FCM | ✅ | ✅ |
| Realtime | Socket.io | ✅ | 🔜 |

---

## 🔐 Authentication

### Backend (Node.js)

#### FCM: JWT-based OAuth 2.0

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

#### Web Push: VAPID

```typescript
const sender = new KxPrexSender({
  webPush: {
    vapidPublicKey: 'YOUR_VAPID_PUBLIC_KEY',
    vapidPrivateKey: 'YOUR_VAPID_PRIVATE_KEY',
    subject: 'mailto:admin@example.com',
  },
  store: deviceStore,
});
```

### Flutter SDK: Custom Headers

```dart
KxPrexSender.setRequestHeadersProvider(() async {
  return {
    'Authorization': 'Bearer ${await getToken()}',
    'X-User-ID': userId,
  };
});
```

---

## 📦 Dependencies

### Backend (Node.js)

```json
{
  "web-push": "^3.6.0",
  "axios": "^1.6.0",
  "jsonwebtoken": "^9.0.2",
  "socket.io": "^4.7.0"
}
```

### Flutter SDK

```yaml
dependencies:
  firebase_messaging: ^14.7.0
  http: ^1.2.0
  shared_preferences: ^2.2.2
```

---

## 🧪 Testing

### Backend Tests

```bash
cd kxprexsender-node
npm test
```

### Flutter Tests

```bash
cd kxprexsender-flutter
flutter test
```

---

## 📚 API Reference

### Backend (Node.js)

See [kxprexsender-node README](kxprexsender-node/README.md)

### Flutter SDK

See [kxprexsender-flutter README](kxprexsender-flutter/README.md)

---

## ❓ FAQ

### Q: Do I need Firebase Admin SDK for the backend?

**A:** No! kxprexsender-node uses OAuth 2.0 JWT authentication directly, avoiding the Firebase Admin SDK dependency.

### Q: How do I register devices?

**A:** The backend exposes a registration endpoint. The Flutter SDK automatically registers devices on initialization.

### Q: How do badges work?

**A:** The backend is the single source of truth. Every push carries the current badge snapshot. The Flutter SDK mirrors this and updates in real-time.

### Q: Can I use this with my existing backend?

**A:** Yes! The package is designed to integrate with any existing backend. Just implement the device store interface.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT License - see LICENSE files in each package directory.

---

## 🔗 Related Links

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Web Push](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Socket.io](https://socket.io/)
- [Flutter](https://flutter.dev/)

---

**Project Version:** 1.0.0
**Last Updated:** February 2026
