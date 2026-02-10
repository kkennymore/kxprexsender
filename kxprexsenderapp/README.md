# 📦 kxprexsender

A production-ready Flutter SDK for push notification handling with backend integration.

## 🧠 Overview

**kxprexsender** is a Flutter package that provides:

- 🔔 Single-call notification initialization
- 📱 Multi-platform support (Android & iOS)
- 🎯 Badge count management (read/unread)
- 🔄 Real-time badge synchronization
- 🎛️ Effect control (notify vs badge-only updates)

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Examples](#examples)
- [FAQ](#faq)

---

## 🚀 Installation

### 1. Add Dependencies

Add to your `pubspec.yaml`:

```yaml
dependencies:
  kxprexsender: ^1.0.0
  firebase_messaging: ^14.7.0
  http: ^1.2.0
  shared_preferences: ^2.2.2
```

### 2. Configure Firebase

Follow the official Firebase setup for your platform:

- [Android Setup](https://firebase.google.com/docs/flutter/setup)
- [iOS Setup](https://firebase.google.com/docs/flutter/setup)

### 3. Initialize in main.dart

```dart
import 'package:flutter/material.dart';
import 'package:kxprexsender/kxprexsender.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await KxPrexSender.initialize(
    KxPrexSenderConfig(
      backendUrl: 'https://your-backend.com',
      appId: 'com.yourapp.app',
      autoRegister: true,
    ),
  );
  
  runApp(const MyApp());
}
```

---

## ⚡ Quick Start

### Basic Usage

```dart
import 'package:kxprexsender/kxprexsender.dart';

// Listen for notifications
KxPrexSender.onMessage((notification) {
  print('Title: ${notification.title}');
  print('Body: ${notification.body}');
  print('Type: ${notification.type}');
});

// Access badge counts
print('Unread: ${KxPrexSender.badges.unread}');
print('Read: ${KxPrexSender.badges.read}');

// Listen to badge changes
KxPrexSender.badges.stream.listen((badges) {
  print('Badges updated - Unread: ${badges.unread}, Read: ${badges.read}');
});
```

### With Authentication

```dart
// Set up authentication headers
KxPrexSender.setRequestHeadersProvider(() async {
  return {
    'Authorization': 'Bearer ${await getAuthToken()}',
    'X-User-ID': userId,
  };
});
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Your Flutter App                        │
├─────────────────────────────────────────────────────────────┤
│                     KxPrexSender                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Core Layer                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│   │
│  │  │ Bootstrap   │  │  Registrar  │  │    API      ││   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘│   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Messaging Layer                    │   │
│  │  ┌─────────────────────────────────────────────────┐│   │
│  │  │              FCM Adapter                         ││   │
│  │  │  - Foreground handler                           ││   │
│  │  │  - Background handler                           ││   │
│  │  │  - Token refresh                                ││   │
│  │  └─────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Badge Layer                         │   │
│  │  ┌─────────────┐  ┌─────────────────────────────────┐│   │
│  │  │Badge Store  │  │     Badge Controller           ││   │
│  │  └─────────────┘  └─────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                   Firebase Cloud Messaging                   │
├─────────────────────────────────────────────────────────────┤
│                      Your Backend API                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 API Reference

### KxPrexSender

The main class that provides all notification functionality.

#### Methods

##### `initialize(config)`

Initializes the SDK and sets up all handlers.

```dart
await KxPrexSender.initialize(
  KxPrexSenderConfig(
    backendUrl: 'https://api.example.com',
    appId: 'com.example.app',
    autoRegister: true,
  ),
);
```

**Parameters:**
- `config` ([KxPrexSenderConfig](#kxprexsenderconfig)) - Configuration options

**Throws:**
- `StateError` - If already initialized

---

##### `onMessage(callback)`

Sets up a callback for foreground notifications.

```dart
KxPrexSender.onMessage((notification) {
  // Handle notification
});
```

**Parameters:**
- `callback` (Function) - Callback function that receives [KxPrexNotification](#kxprexnotification)

**Note:** This only fires for notifications with `notify: true` in the effects.

---

##### `onMessageStream`

Alternative stream-based API for notifications.

```dart
KxPrexSender.onMessageStream.listen((notification) {
  // Handle notification
});
```

---

##### `setRequestHeadersProvider(provider)`

Sets a function to provide authentication headers for API calls.

```dart
KxPrexSender.setRequestHeadersProvider(() async {
  final token = await authService.getToken();
  return {
    'Authorization': 'Bearer $token',
  };
});
```

**Parameters:**
- `provider` (Function) - Async function returning headers Map<String, String>

---

##### `refreshBadges()`

Manually refreshes badge counts from the backend.

```dart
await KxPrexSender.refreshBadges();
```

**Returns:** `Future<void>`

---

##### `registerDevice()`

Manually triggers device registration.

```dart
await KxPrexSender.registerDevice();
```

**Returns:** `Future<bool>` - True if registration succeeded

---

##### `getToken()`

Gets the current FCM token.

```dart
final token = await KxPrexSender.getToken();
print('FCM Token: $token');
```

**Returns:** `Future<String?>` - The FCM token or null

---

### Properties

##### `badges`

Access to badge count management.

```dart
// Current values
final unread = KxPrexSender.badges.unread;
final read = KxPrexSender.badges.read;

// Stream for reactive updates
KxPrexSender.badges.stream.listen((badges) {
  // Update UI
});
```

**Type:** [KxPrexBadgeController](#kxprexbadgecontroller)

---

## 📦 Models

### KxPrexSenderConfig

Configuration options for the SDK.

```dart
class KxPrexSenderConfig {
  final String backendUrl;
  final String appId;
  final bool autoRegister;

  const KxPrexSenderConfig({
    required this.backendUrl,
    required this.appId,
    this.autoRegister = true,
  });
}
```

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `backendUrl` | String | Yes | - | Base URL of your backend API |
| `appId` | String | Yes | - | Your application identifier |
| `autoRegister` | bool | No | `true` | Automatically register device on initialization |

---

### KxPrexNotification

Represents a notification received from the server.

```dart
class KxPrexNotification {
  final String title;
  final String body;
  final String type;
  final Map<String, dynamic> data;
  final bool notify;
  final bool badge;

  KxPrexNotification({
    required this.title,
    required this.body,
    required this.type,
    required this.data,
    this.notify = true,
    this.badge = true,
  });
}
```

| Property | Type | Description |
|----------|------|-------------|
| `title` | String | Notification title |
| `body` | String | Notification body text |
| `type` | String | Notification type (e.g., 'chat', 'admin', 'forum') |
| `data` | Map<String, dynamic> | Additional custom data |
| `notify` | bool | Whether notification should be shown |
| `badge` | bool | Whether badge count should be updated |

---

### KxPrexBadges

Badge count model.

```dart
class KxPrexBadges {
  final int unread;
  final int read;

  const KxPrexBadges({
    required this.unread,
    required this.read,
  });
}
```

| Property | Type | Description |
|----------|------|-------------|
| `unread` | int | Number of unread notifications |
| `read` | int | Number of read notifications |

---

### KxPrexBadgeController

Controller for managing badge state.

#### Properties

```dart
// Get current values
final unread = KxPrexSender.badges.unread;
final read = KxPrexSender.badges.read;

// Stream for reactive updates
final stream = KxPrexSender.badges.stream;
```

#### Methods

##### `refresh()`

Refreshes badges from backend.

```dart
await KxPrexSender.badges.refresh();
```

---

## 💡 Examples

### Complete Chat App Example

```dart
import 'package:flutter/material.dart';
import 'package:kxprexsender/kxprexsender.dart';

class ChatApp extends StatefulWidget {
  @override
  State<ChatApp> createState() => _ChatAppState();
}

class _ChatAppState extends State<ChatApp> {
  int _unreadCount = 0;

  @override
  void initState() {
    super.initState();
    
    // Listen to badge updates
    KxPrexSender.badges.stream.listen((badges) {
      setState(() {
        _unreadCount = badges.unread;
      });
    });

    // Listen to notifications
    KxPrexSender.onMessage((notification) {
      if (notification.type == 'chat') {
        _showChatNotification(notification);
      }
    });
  }

  void _showChatNotification(KxPrexNotification notification) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${notification.title}: ${notification.body}'),
        action: SnackBarAction(
          label: 'Open',
          onPressed: () => _openChat(notification.data['chatId']),
        ),
      ),
    );
  }

  void _openChat(String chatId) {
    // Navigate to chat screen
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Chat'),
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
              onPressed: () async {
                await KxPrexSender.refreshBadges();
              },
              child: Text('Refresh Badges'),
            ),
          ],
        ),
      ),
    );
  }
}
```

---

### Admin Notification Handler

```dart
import 'package:kxprexsender/kxprexsender.dart';

class AdminNotificationHandler {
  static void setup() {
    KxPrexSender.onMessage((notification) {
      if (notification.type == 'admin') {
        _handleAdminNotification(notification);
      }
    });
  }

  static void _handleAdminNotification(KxPrexNotification notification) {
    // Handle admin/system notifications differently
    // These might show dialogs, etc.
    print('Admin notification: ${notification.title}');
  }
}
```

---

### Custom Headers Provider

```dart
import 'package:kxprexsender/kxprexsender.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  static Future<Map<String, String>> Function() getHeadersProvider() {
    return () async {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');
      final userId = prefs.getString('user_id');

      return {
        'Authorization': 'Bearer $token',
        'X-User-ID': userId ?? '',
      };
    };
  }
}

// In main.dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  KxPrexSender.setRequestHeadersProvider(AuthService.getHeadersProvider());

  await KxPrexSender.initialize(
    KxPrexSenderConfig(
      backendUrl: 'https://api.example.com',
      appId: 'com.example.app',
    ),
  );

  runApp(MyApp());
}
```

---

### Background Handler Setup

```dart
import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:kxprexsender/kxprexsender.dart';

// Top-level background handler
@pragma('vm:entry-point')
Future<void> kxPrexBackgroundHandler(RemoteMessage message) async {
  // This handler will be called when app is in background/terminated
  // It normalizes the payload but doesn't show notifications
  await KxPrexSender.initialize(
    KxPrexSenderConfig(
      backendUrl: 'https://api.example.com',
      appId: 'com.example.app',
      autoRegister: false,
    ),
  );
}

void main() {
  FirebaseMessaging.onBackgroundMessage(kxPrexBackgroundHandler);
  
  runApp(MyApp());
}
```

---

## 🔧 Backend Integration

### Required Endpoints

Your backend must implement the following endpoints:

#### 1. Register Device

```
POST {backendUrl}/kxprexsender/devices/register
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "platform": "android",
  "transport": "fcm",
  "token": "fcm_token_here",
  "appId": "com.example.app"
}
```

**Response:** `200 OK` on success

---

#### 2. Get Badges

```
GET {backendUrl}/kxprexsender/badges
```

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "unread": 5,
  "read": 10
}
```

---

### Expected Push Payload Format

Your backend should send notifications in this format:

```json
{
  "notification": {
    "title": "New Message",
    "body": "You have a new message from John"
  },
  "data": {
    "type": "chat",
    "chatId": "12345",
    "badges_unread": "6",
    "badges_read": "10",
    "kx_badge_enabled": "true",
    "kx_notify": "true"
  }
}
```

---

## 🎛️ Effects Control

The SDK supports controlling notification and badge updates independently:

### Send Options (from backend)

| notify | badge | Behavior |
|--------|-------|----------|
| true | true | Normal notification + badge update |
| false | true | Badge-only update (silent) |
| true | false | Notification only, no badge change |
| false | false | No-op (will be rejected) |

### Example: Silent Badge Sync

When the user reads a message on another device:

```dart
// Backend sends:
{
  "data": {
    "type": "sync",
    "badges_unread": "5",
    "badges_read": "15",
    "kx_badge_enabled": "true",
    "kx_notify": "false"
  }
}
```

The SDK will:
- ✅ Update badge counts
- ❌ Not trigger `onMessage` callback
- ❌ Not show system notification

---

## ❓ FAQ

### Q: Can I use this without Firebase?

**A:** No, this SDK relies on Firebase Cloud Messaging for push notifications.

### Q: How do I handle notification taps?

**A:** Use `FirebaseMessaging.onMessageOpenedApp` alongside KxPrexSender:

```dart
FirebaseMessaging.onMessageOpenedApp.listen((message) {
  // Handle notification tap
  final data = message.data;
  // Navigate accordingly
});
```

### Q: How do I show local notifications?

**A:** KxPrexSender is intentionally designed to NOT handle local notifications. Use `flutter_local_notifications` package alongside it:

```dart
// After receiving KxPrexNotification
if (notification.notify) {
  await flutterLocalNotificationsPlugin.show(
    0,
    notification.title,
    notification.body,
    platformChannelSpecifics,
  );
}
```

### Q: How do I test badge updates?

**A:** Use `KxPrexSender.refreshBadges()` to force a sync from the backend, or send a test push with badge data in the payload.

### Q: What happens if the device is unregistered?

**A:** The SDK will catch the unregistered error and call your backend's device cleanup. You can listen for the `onError` stream for custom handling.

### Q: Can I use this with web push?

**A:** Currently, this SDK is designed for mobile (Android/iOS). Web push support would require a different implementation.

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

## 📞 Support

For issues and questions:
- Open a GitHub issue
- Check existing documentation
- Review FAQ section
