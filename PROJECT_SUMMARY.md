# Project Summary

## kxprexsender - Complete Notification System

A full-stack notification system with a Node.js backend and Flutter SDK for cross-platform push notifications.

---

## 📁 Project Structure

```
kxprexsender/
├── README.md                              # Main project documentation
│
├── kxprexsender-node/                     # Backend npm package
│   ├── package.json
│   ├── tsconfig.json
│   ├── .eslintrc.json
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .env.example
│   ├── .gitignore
│   ├── API.md                             # REST API documentation
│   ├── README.md                          # Backend documentation
│   │
│   ├── src/
│   │   ├── index.ts                       # Entry point
│   │   ├── KxPrexSender.ts               # Main class
│   │   ├── types.ts                       # TypeScript interfaces
│   │   ├── helpers.ts                     # Utility functions
│   │   ├── deviceStore.ts                 # In-memory store example
│   │   ├── mongoDeviceStore.ts            # MongoDB implementation
│   │   ├── postgresDeviceStore.ts         # PostgreSQL implementation
│   │   │
│   │   ├── core/
│   │   │   ├── router.ts                  # Notification routing
│   │   │   └── payloadBuilder.ts          # Payload construction
│   │   │
│   │   ├── channels/
│   │   │   ├── webpush.ts                # Web Push transport
│   │   │   ├── fcm.ts                    # FCM HTTP v1 transport
│   │   │   └── socket.ts                 # Socket.io transport
│   │   │
│   │   └── auth/
│   │       └── fcmAuth.ts                # FCM OAuth authentication
│   │
│   └── examples/
│       └── server.ts                     # Complete example server
│
└── kxprexsenderapp/                      # Flutter SDK package
    ├── pubspec.yaml
    ├── analysis_options.yaml
    ├── README.md                          # Flutter SDK documentation
    ├── EXAMPLE_USAGE.md                   # Detailed examples
    ├── IMPLEMENTATION_ROADMAP.md         # Development roadmap
    ├── CHANGELOG.md
    ├── CONTRIBUTING.md
    │
    ├── lib/
    │   └── kxprexsender.dart             # Main entry point
    │   └── src/
    │       ├── core/
    │       │   ├── bootstrap.dart         # Initialization
    │       │   ├── api.dart              # Backend API service
    │       │   └── registrar.dart        # Device registration
    │       │
    │       ├── messaging/
    │       │   └── fcm_adapter.dart      # Firebase Cloud Messaging
    │       │
    │       ├── badges/
    │       │   ├── badge_store.dart      # Badge state management
    │       │   └── badge_controller.dart # Badge public API
    │       │
    │       └── models/
    │           ├── config.dart          # Configuration
    │           ├── notification.dart   # Notification model
    │           └── badges.dart         # Badge model
    │
    └── example/
        ├── example.dart                # Basic example
        └── web_demo.dart               # Demo with web UI
```

---

## ✨ Features

### Backend (kxprexsender-node)

| Feature | Description |
|---------|-------------|
| Multi-Transport | Web Push, FCM, Socket.io |
| Badge Management | Read/unread badge counts |
| Effect Control | Notify vs badge-only updates |
| Delivery Reports | Per-device success/failure |
| No Firebase Admin SDK | JWT-based FCM authentication |
| Multiple Databases | In-memory, MongoDB, PostgreSQL |
| Docker Support | Production-ready containers |
| TypeScript | Full type safety |

### Flutter SDK (kxprexsender-flutter)

| Feature | Description |
|---------|-------------|
| Single API | One-line initialization |
| Auto Registration | Automatic device registration |
| Badge Sync | Real-time badge updates |
| Custom Auth | Header injection for authentication |
| Token Refresh | Automatic token renewal |
| Background Support | Handler for background messages |
| Well Documented | Comprehensive docs & examples |

---

## 🚀 Quick Start

### Backend

```bash
cd kxprexsender-node

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials

# Run example server
npm run dev
```

### Flutter SDK

```yaml
# pubspec.yaml
dependencies:
  kxprexsender: ^1.0.0
```

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

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [README.md](README.md) | Main project overview |
| [API.md](kxprexsender-node/API.md) | REST API reference |
| [Backend README](kxprexsender-node/README.md) | Node.js package docs |
| [Flutter README](kxprexsenderapp/README.md) | Flutter SDK docs |
| [Example Usage](kxprexsenderapp/EXAMPLE_USAGE.md) | Flutter examples |
| [Roadmap](kxprexsenderapp/IMPLEMENTATION_ROADMAP.md) | Implementation plan |

---

## 🔧 Configuration

### Environment Variables

```bash
# Firebase
FCM_PROJECT_ID=your-project-id
FCM_CLIENT_EMAIL=firebase-adminsdk@...
FCM_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...

# Web Push
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_SUBJECT=mailto:admin@example.com

# Server
PORT=3000
BACKEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/kxprexsender
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
cd kxprexsenderapp
flutter test
```

---

## 🐳 Docker Deployment

### Build and Run

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f app
```

---

## 📦 Dependencies

### Backend

```json
{
  "dependencies": {
    "web-push": "^3.6.0",
    "axios": "^1.6.0",
    "jsonwebtoken": "^9.0.2",
    "socket.io": "^4.7.0"
  }
}
```

### Flutter

```yaml
dependencies:
  firebase_messaging: ^14.7.0
  http: ^1.2.0
  shared_preferences: ^2.2.2
```

---

## 🎯 Use Cases

### Chat App

```typescript
// Backend - Send message notification
await sender.send({
  userId: 'user_123',
  title: 'New Message',
  body: 'You have a new message',
  type: 'chat',
  data: { chatId: 'chat_456', senderId: 'user_789' },
  badges: { unread: 5, read: 10 },
});
```

### Forum App

```typescript
// Backend - New reply notification
await sender.send({
  userId: 'user_123',
  title: 'New Reply',
  body: 'Someone replied to your thread',
  type: 'forum',
  data: { threadId: 'thread_123', replyId: 'reply_456' },
});
```

### Admin Notifications

```typescript
// Backend - System announcement
await sender.send({
  userId: 'user_123',
  title: 'System Update',
  body: 'Maintenance scheduled',
  type: 'admin',
  effects: { notify: true, badge: false },
});
```

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Backend App                          │
├─────────────────────────────────────────────────────────────┤
│                   kxprexsender (Node.js)                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Router                            │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │   │
│  │  │ Web Push │  │   FCM    │  │    Socket.io     │ │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                   Firebase Cloud Messaging                    │
├─────────────────────────────────────────────────────────────┤
│              Android & iOS Devices                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              kxprexsender (Flutter SDK)              │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────┐│   │
│  │  │  FCM       │  │   Badge   │  │  Registration  ││   │
│  │  │  Adapter   │  │   Store   │  │  & API         ││   │
│  │  └────────────┘  └────────────┘  └────────────────┘│   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Update documentation
6. Submit a pull request

---

## 📄 License

MIT License - see LICENSE files in each package directory.

---

## 📞 Support

- [GitHub Issues](https://github.com/your-org/kxprexsender/issues)
- [Documentation](README.md)
- [FAQ](kxprexsenderapp/README.md#faq)

---

**Version:** 1.0.0  
**Last Updated:** February 2026
