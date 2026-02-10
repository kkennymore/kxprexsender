# 📦 kxprexsender

A production-ready notification system with backend (Node.js) and Flutter SDK support.

## 🧠 Overview

**kxprexsender** provides a complete notification solution with:

- 🔔 **Backend (Node.js)**: Multi-transport routing with caching, metrics, and templates
- 📱 **Flutter SDK**: Push notifications, local notifications, offline queue, and analytics
- 🏷️ **Badge Management**: Real-time read/unread badge synchronization
- 🎛️ **Effect Control**: Independent notification and badge update control
- 📊 **Analytics**: Built-in tracking for engagement metrics
- 🚀 **Performance**: Redis caching, connection pooling, batch processing

---

## 📋 Table of Contents

- [Installation](#installation)
- [Backend (Node.js)](#backend-nodejs)
- [Flutter SDK](#flutter-sdk)
- [Features](#features)
- [Documentation](#documentation)
- [Examples](#examples)
- [FAQ](#faq)

---

## 🚀 Installation

### Backend (Node.js)

```bash
cd kxprexsender-node
npm install
```

### Flutter SDK

```yaml
dependencies:
  kxprexsender: ^2.0.0
```

---

## 📦 Backend (Node.js)

### Quick Start

```typescript
import { KxPrexSender, CacheService, RateLimiterService, MetricsService } from 'kxprexsender';

// Initialize services
const cache = new CacheService({ provider: 'redis', host: 'localhost' });
await cache.connect();

const rateLimiter = new RateLimiterService({
  windowMs: 60000,
  maxRequests: 100,
});

const metrics = new MetricsService();

// Create sender
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
  store: new InMemoryDeviceStore(),
  cache,
  rateLimiter,
  metrics,
});

// Send notification
const result = await sender.send({
  userId: 'user_123',
  title: 'New Message',
  body: 'You have a new message',
  type: 'chat',
  data: { chatId: 'chat_456' },
  badges: { unread: 5, read: 10 },
});

console.log(`Delivered: ${result.delivered}, Failed: ${result.failed}`);
```

### Backend Features

#### Caching Layer

```typescript
const cache = new CacheService({
  provider: 'redis', // or 'memory'
  host: 'localhost',
  port: 6379,
  ttl: 3600, // 1 hour
  maxSize: 10000,
});

await cache.connect();

// Get or set with automatic caching
const value = await cache.getOrSet('key', async () => {
  return await fetchFromDatabase('key');
});

cache.invalidate('user:*'); // Pattern-based invalidation
```

#### Rate Limiting

```typescript
const rateLimiter = new RateLimiterService({
  windowMs: 60000,
  maxRequests: 100,
  blockDuration: 60000,
});

// Check rate limit
const result = await rateLimiter.consume('user_123');

// If rate limited
if (!result.allowed) {
  console.log(`Retry after ${result.retryAfter} seconds`);
}
```

#### Metrics (Prometheus)

```typescript
const metrics = new MetricsService({
  enabled: true,
  path: '/metrics',
  prefix: 'kxprex',
});

// Automatic metrics
metrics.incrementCounter('notifications_sent_total', { channel: 'fcm' });
metrics.observeHistogram('notification_delivery_latency_seconds', 0.5, { channel: 'fcm' });

// Get metrics for Prometheus scraping
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', metrics.getMetricsContentType());
  res.send(await metrics.getMetrics());
});
```

#### Health Checks

```typescript
const healthCheck = new HealthCheckService({
  path: '/health',
  dependencies: {
    redis: { host: 'localhost' },
    postgres: { connectionString: 'postgresql://...' },
    fcm: { enabled: true },
  },
});

await healthCheck.initialize();

app.get('/health', healthCheck.getHealthCheckHandler());
app.get('/healthz', healthCheck.getLivenessHandler());
app.get('/ready', healthCheck.getReadinessHandler());
```

#### Template System

```typescript
const templateStore = createTemplateStore();
const renderer = createTemplateRenderer(templateStore);

// Create template
await templateStore.create({
  name: 'new_message',
  channels: {
    fcm: {
      title: 'New message from {{senderName}}',
      body: '{{messagePreview}}',
    },
    webpush: {
      title: 'New message from {{senderName}}',
      body: '{{messagePreview}}',
    },
  },
  dataFields: ['senderName', 'messagePreview'],
});

// Render template
const notification = await renderer.render('new_message', {
  locale: 'es',
  data: {
    senderName: 'Juan',
    messagePreview: 'Hola, ¿cómo estás?',
  },
  badges: { unread: 5, read: 10 },
});

await sender.send({
  userId: 'user_123',
  ...notification,
});
```

#### Notification History

```typescript
const historyStore = createHistoryStore();

// Create history entry
await historyStore.create({
  userId: 'user_123',
  type: 'chat',
  title: 'New Message',
  body: 'Hello!',
  channels: ['fcm'],
  badges: { unread: 5, read: 10 },
});

// Get user history
const { notifications, total } = await historyStore.getByUserId('user_123', {
  page: 1,
  limit: 20,
  type: 'chat',
});

// Update status
await historyStore.updateStatus('notif_123', 'delivered');

// Get statistics
const stats = await historyStore.getStats('user_123', {
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
});
```

---

## 📱 Flutter SDK

### Quick Start

```dart
import 'package:kxprexsender/kxprexsender.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize SDK
  await KxPrexSender.initialize(
    KxPrexSenderConfig(
      backendUrl: 'https://api.example.com',
      appId: 'com.example.app',
    ),
  );

  // Listen for notifications
  KxPrexSender.onMessage((notification) {
    print('${notification.title}: ${notification.body}');
  });

  // Access badges
  print('Unread: ${KxPrexSender.badges.unread}');

  runApp(MyApp());
}
```

### Local Notifications

```dart
// Configure notification channels
await KxPrexSender.configureChannels([
  KxPrexNotificationChannel(
    id: 'chat',
    name: 'Chat Messages',
    description: 'Notifications for chat messages',
    importance: Importance.high,
    actions: [
      KxPrexNotificationAction(
        id: 'reply',
        title: 'Reply',
        type: NotificationActionType.reply,
        inputPlaceholder: 'Type a reply...',
      ),
      KxPrexNotificationAction(
        id: 'view',
        title: 'View',
        type: NotificationActionType.open,
      ),
    ],
  ),
]);

// Show local notification
await KxPrexSender.showLocalNotification(
  id: '123',
  title: 'Reminder',
  body: 'Meeting in 15 minutes',
  channelId: 'default',
);

// Handle notification taps
KxPrexSender.onNotificationTapped.listen((response) {
  final actionId = response.actionId;
  final data = response.payload;
  print('Tapped: $actionId with data: $data');
});
```

### Offline Queue

```dart
// Add to offline queue
await KxPrexSender.queue.addNotification(
  KxPrexNotification(
    title: 'Draft',
    body: 'This will be sent when online',
    type: 'draft',
    data: {},
  ),
  priority: Priority.high,
);

// Listen to queue events
KxPrexSender.queue.events.listen((event) {
  print('Queue event: ${event.type}');
});

// Get queue size
final size = await KxPrexSender.queue.getQueueSize();
print('Pending notifications: $size');

// Process queue manually
await KxPrexSender.queue.processQueue();
```

### Analytics

```dart
// Track notification received
KxPrexSender.analytics.trackReceived(
  notificationId: 'notif_123',
  type: 'chat',
  data: {'chatId': '123'},
);

// Track opened
KxPrexSender.analytics.trackOpened(
  notificationId: 'notif_123',
  type: 'chat',
  actionId: 'view',
);

// Get session analytics
final analytics = await KxPrexSender.getSessionAnalytics();
print('Received: ${analytics['received']}');
print('Opened: ${analytics['opened']}');
print('Open Rate: ${analytics['openRate']}%');
```

### Badge Management

```dart
// Update badge count
await KxPrexSender.setBadgeCount(5);

// Clear badge
await KxPrexSender.clearBadge();

// Listen to badge changes
KxPrexSender.badges.stream.listen((badges) {
  print('Unread: ${badges.unread}');
  print('Read: ${badges.read}');
});
```

---

## 🎯 Features Comparison

### Backend Features

| Feature | Status | Description |
|---------|--------|-------------|
| Multi-Transport | ✅ | Web Push, FCM, Socket.io |
| Badge Management | ✅ | Read/unread counts |
| Effects Control | ✅ | Notify vs badge-only |
| Redis Caching | ✅ | TTL, pattern invalidation |
| Rate Limiting | ✅ | Per-user, per-endpoint |
| Prometheus Metrics | ✅ | Full observability |
| Health Checks | ✅ | Comprehensive checks |
| Template System | ✅ | i18n support |
| Notification History | ✅ | Audit trail |
| Batch Processing | ✅ | Efficient bulk sends |
| Connection Pooling | ✅ | Resource optimization |

### Flutter SDK Features

| Feature | Status | Description |
|---------|--------|-------------|
| Push Notifications | ✅ | FCM integration |
| Badge Management | ✅ | Real-time sync |
| Local Notifications | ✅ | Scheduled, actions |
| Notification Channels | ✅ | Android channels |
| Offline Queue | ✅ | SQLite-backed |
| Analytics | ✅ | Session tracking |
| Deep Links | 🔜 | Coming soon |
| Rich Media | 🔜 | Coming soon |
| Action Buttons | ✅ | Reply, open, destructive |

---

## 📚 Documentation

### Backend Documentation

- [API Reference](kxprexsender-node/API.md)
- [Template System](kxprexsender-node/README.md)
- [Health Checks](kxprexsender-node/src/services/healthCheck.ts)

### Flutter Documentation

- [Usage Guide](kxprexsenderapp/EXAMPLE_USAGE.md)
- [API Reference](https://pub.dev/documentation/kxprexsender)
- [Local Notifications](kxprexsenderapp/lib/src/messaging/local_notifications.dart)

---

## 💻 Examples

### Backend Example

```typescript
// Complete server example
import { createServer } from 'http';
import express from 'express';
import { KxPrexSender, createRateLimiter } from 'kxprexsender';

const app = express();
const server = createServer(app);

const sender = new KxPrexSender({
  fcm: { /* config */ },
  webPush: { /* config */ },
  store: new InMemoryDeviceStore(),
});

const rateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 100,
});

app.use(express.json());

app.post('/send', rateLimiter.middleware(), async (req, res) => {
  const { userId, title, body, type } = req.body;
  
  const result = await sender.send({
    userId,
    title,
    body,
    type,
    badges: { unread: 5, read: 10 },
  });
  
  res.json(result);
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Flutter Example

```dart
// Complete app example
import 'package:flutter/material.dart';
import 'package:kxprexsender/kxprexsender.dart';

class MyApp extends StatefulWidget {
  @override
  _MyAppState createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  int _unreadCount = 0;

  @override
  void initState() {
    super.initState();

    // Listen to badge updates
    KxPrexSender.badges.stream.listen((badges) {
      setState(() => _unreadCount = badges.unread);
    });

    // Listen to notifications
    KxPrexSender.onMessage((notification) {
      _showNotificationDialog(notification);
    });

    // Listen to taps
    KxPrexSender.onNotificationTapped.listen((response) {
      _handleNotificationTap(response.payload);
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(
          title: Text('Notifications'),
          actions: [
            if (_unreadCount > 0)
              Badge(
                label: Text('$_unreadCount'),
                child: Icon(Icons.notifications),
              ),
          ],
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Unread: $_unreadCount'),
              ElevatedButton(
                onPressed: () => KxPrexSender.refreshBadges(),
                child: Text('Refresh'),
              ),
              ElevatedButton(
                onPressed: () => _sendTestNotification(),
                child: Text('Send Test'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _sendTestNotification() async {
    await KxPrexSender.showLocalNotification(
      id: 'test_${DateTime.now().millisecondsSinceEpoch}',
      title: 'Test Notification',
      body: 'This is a test notification',
      channelId: 'default',
    );
  }

  void _showNotificationDialog(KxPrexNotification notification) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(notification.title),
        content: Text(notification.body),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('OK'),
          ),
        ],
      ),
    );
  }
}
```

---

## ❓ FAQ

### Q: How do I upgrade from v1 to v2?

**A:** Major version includes breaking changes:
- Backend: New service constructors (CacheService, RateLimiterService, etc.)
- Flutter: New `KxPrexSender` class with additional methods
- Check [migration guide](MIGRATION.md) for details

### Q: Can I use Redis for caching without rate limiting?

**A:** Yes, configure each service independently:

```typescript
const cache = new CacheService({ provider: 'redis', host: '...' });
const rateLimiter = new RateLimiterService({ /* memory */ });
```

### Q: How do I handle notification actions in Flutter?

**A:** Use the actions parameter:

```dart
KxPrexPrexNotificationAction(
  id: 'reply',
  title: 'Reply',
  type: NotificationActionType.reply,
  inputPlaceholder: 'Type...',
)

// Handle in onNotificationTapped
KxPrexSender.onNotificationTapped.listen((response) {
  if (response.actionId == 'reply') {
    // Handle reply
  }
});
```

### Q: What's the difference between local and push notifications?

| Aspect | Push | Local |
|--------|------|-------|
| Source | Server | App |
| Delivery | FCM/APNs | Immediate |
| Offline | Queued | Immediate |
| Actions | Limited | Full |
| Use Case | Server alerts | Reminders |

---

## 📄 License

MIT License - see LICENSE files in each package directory.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Update documentation
6. Submit a pull request

---

**Package Version:** 2.0.0  
**Last Updated:** February 2026
