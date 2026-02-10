# 📖 KxPrexSender Example Usage Guide

This document provides comprehensive examples for using the kxprexsender Flutter package in your application.

---

## 📋 Table of Contents

1. [Basic Setup](#1-basic-setup)
2. [Complete Integration Example](#2-complete-integration-example)
3. [Notification Handling](#3-notification-handling)
4. [Badge Management](#4-badge-management)
5. [Authentication](#5-authentication)
6. [Background Handling](#6-background-handling)
7. [Advanced Usage](#7-advanced-usage)
8. [Backend Payload Examples](#8-backend-payload-examples)
9. [Testing Guide](#9-testing-guide)
10. [Common Issues & Solutions](#10-common-issues--solutions)

---

## 1. Basic Setup

### 1.1 Add Dependencies

Add to your `pubspec.yaml`:

```yaml
dependencies:
  kxprexsender: ^1.0.0
  firebase_messaging: ^14.7.0
  http: ^1.2.0
  shared_preferences: ^2.2.2
```

### 1.2 Firebase Setup

#### Android (`android/app/build.gradle`)

```gradle
android {
    defaultConfig {
        applicationId "com.yourcompany.yourapp"
        // ... other config
    }
}

dependencies {
    // Add these lines
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging'
}
```

#### iOS (`ios/Podfile`)

```ruby
platform :ios, '15.0'

target 'Runner' do
  # Add these lines
  pod 'Firebase/Messaging'
end
```

### 1.3 Minimal Example

```dart
import 'package:flutter/material.dart';
import 'package:kxprexsender/kxprexsender.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KxPrexSender Demo',
      home: const HomePage(),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Demo')),
      body: const Center(
        child: Text('KxPrexSender is initialized!'),
      ),
    );
  }
}
```

---

## 2. Complete Integration Example

Here's a complete example showing all features:

```dart
import 'package:flutter/material.dart';
import 'package:kxprexsender/kxprexsender.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set up background handler BEFORE initializing
  FirebaseMessaging.onBackgroundMessage(kxPrexBackgroundHandler);

  await KxPrexSender.initialize(
    KxPrexSenderConfig(
      backendUrl: 'https://api.yourbackend.com',
      appId: 'com.yourcompany.yourapp',
      autoRegister: true,
    ),
  );

  // Set up notification listener
  KxPrexSender.onMessage((notification) {
    if (notification.type == 'chat') {
      _showChatNotification(notification);
    } else if (notification.type == 'admin') {
      _showAdminNotification(notification);
    }
  });

  // Set up authentication headers
  KxPrexSender.setRequestHeadersProvider(() async {
    final token = await _getAuthToken();
    return {
      'Authorization': 'Bearer $token',
      'X-User-ID': _getUserId(),
    };
  });

  runApp(const MyApp());
}

// Background handler
@pragma('vm:entry-point')
Future<void> kxPrexBackgroundHandler(RemoteMessage message) async {
  await KxPrexSender.initialize(
    KxPrexSenderConfig(
      backendUrl: 'https://api.yourbackend.com',
      appId: 'com.yourcompany.yourapp',
      autoRegister: false,
    ),
  );
}

void _showChatNotification(KxPrexNotification notification) {
  // Show in-app notification
}

void _showAdminNotification(KxPrexNotification notification) {
  // Show admin notification
}

Future<String> _getAuthToken() async {
  // Your auth logic
  return 'your_token';
}

String _getUserId() {
  // Your user ID logic
  return 'user_123';
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KxPrexSender Demo',
      home: const HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _unreadCount = 0;
  int _readCount = 0;

  @override
  void initState() {
    super.initState();

    // Listen to badge updates
    KxPrexSender.badges.stream.listen((badges) {
      setState(() {
        _unreadCount = badges.unread;
        _readCount = badges.read;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('KxPrexSender Demo'),
        actions: [
          if (_unreadCount > 0)
            Badge(
              label: Text('$_unreadCount'),
              child: const Icon(Icons.notifications),
            ),
        ],
      ),
      body: Column(
        children: [
          _buildBadgeDisplay(),
          _buildActions(),
        ],
      ),
    );
  }

  Widget _buildBadgeDisplay() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          Column(
            children: [
              Text('$_unreadCount', style: const TextStyle(fontSize: 32)),
              const Text('Unread'),
            ],
          ),
          Column(
            children: [
              Text('$_readCount', style: const TextStyle(fontSize: 32)),
              const Text('Read'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActions() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        ElevatedButton(
          onPressed: () => KxPrexSender.refreshBadges(),
          child: const Text('Refresh Badges'),
        ),
        ElevatedButton(
          onPressed: () async {
            final token = await KxPrexSender.getToken();
            print('Token: $token');
          },
          child: const Text('Get Token'),
        ),
      ],
    );
  }
}
```

---

## 3. Notification Handling

### 3.1 Basic Notification Listener

```dart
KxPrexSender.onMessage((notification) {
  print('Title: ${notification.title}');
  print('Body: ${notification.body}');
  print('Type: ${notification.type}');
  print('Data: ${notification.data}');
});
```

### 3.2 Type-Specific Handling

```dart
KxPrexSender.onMessage((notification) {
  switch (notification.type) {
    case 'chat':
      _handleChatNotification(notification);
      break;
    case 'forum':
      _handleForumNotification(notification);
      break;
    case 'admin':
      _handleAdminNotification(notification);
      break;
    case 'system':
      _handleSystemNotification(notification);
      break;
    default:
      _handleGenericNotification(notification);
  }
});

void _handleChatNotification(KxPrexNotification notification) {
  final chatId = notification.data['chatId'];
  final senderName = notification.data['senderName'];

  // Navigate to chat screen
  // Show in-app notification
  _showSnackbar('New message from $senderName');
}

void _handleForumNotification(KxPrexNotification notification) {
  final threadId = notification.data['threadId'];
  final author = notification.data['author'];

  // Navigate to thread
}

void _handleAdminNotification(KxPrexNotification notification) {
  // Show admin alert dialog
  _showAdminDialog(notification);
}

void _handleSystemNotification(KxPrexNotification notification) {
  // Show system message
}

void _handleGenericNotification(KxPrexNotification notification) {
  // Default handling
}
```

### 3.3 Stream-Based API

```dart
// Alternative to onMessage callback
KxPrexSender.onMessageStream.listen((notification) {
  // Handle notification
});

// With where clause for filtering
KxPrexSender.onMessageStream
    .where((n) => n.type == 'chat')
    .listen((notification) {
  // Handle only chat notifications
});
```

### 3.4 Using Notification Data

```dart
KxPrexSender.onMessage((notification) {
  // Access all data fields
  final data = notification.data;

  // Safe access with null checks
  final chatId = data['chatId'] ?? '';
  final threadId = data['threadId'] ?? '';
  final actionId = data['actionId'] ?? '';

  // Type conversion
  final timestamp = int.tryParse(data['timestamp'] ?? '0') ?? 0;
  final isUrgent = data['urgent'] == 'true';

  // Navigate based on data
  if (notification.type == 'chat' && chatId.isNotEmpty) {
    _navigateToChat(chatId);
  }
});
```

---

## 4. Badge Management

### 4.1 Accessing Badge Counts

```dart
// Get current counts
final unread = KxPrexSender.badges.unread;
final read = KxPrexSender.badges.read;
final total = KxPrexSender.badges.total;

// Check if has unread
if (KxPrexSender.badges.hasUnread) {
  // Show badge indicator
}
```

### 4.2 Reactive Badge Display

```dart
class BadgeCounter extends StatelessWidget {
  const BadgeCounter({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<KxPrexBadges>(
      stream: KxPrexSender.badges.stream,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Icon(Icons.notifications);
        }

        final badges = snapshot.data!;
        final hasUnread = badges.unread > 0;

        return Badge(
          label: Text('${badges.unread}'),
          isLabelVisible: hasUnread,
          child: const Icon(Icons.notifications),
        );
      },
    );
  }
}
```

### 4.3 Manual Badge Refresh

```dart
// Pull to refresh badges
Future<void> _onRefresh() async {
  await KxPrexSender.refreshBadges();
}

// Refresh with loading indicator
Future<void> _refreshWithLoading() async {
  setState(() => _isLoading = true);
  try {
    await KxPrexSender.refreshBadges();
  } finally {
    setState(() => _isLoading = false);
  }
}
```

### 4.4 Badge Display in Different Contexts

```dart
// Bottom navigation badge
bottomNavigationBar: BottomNavigationBar(
  items: [
    BottomNavigationBarItem(
      icon: KxPrexSender.badges.hasUnread
          ? const Badge(label: Text('!'), child: Icon(Icons.home))
          : const Icon(Icons.home),
      label: 'Home',
    ),
    // ... other items
  ],
),

// Tab bar badge
DefaultTabController(
  length: 3,
  child: Scaffold(
    appBar: AppBar(
      bottom: TabBar(
        tabs: [
          Tab(
            icon: KxPrexSender.badges.hasUnread
                ? Badge(label: const Text('5'), child: const Icon(Icons.mail))
                : const Icon(Icons.mail),
          ),
          // ... other tabs
        ],
      ),
    ),
  ),
),

// Floating action button badge
Stack(
  children: [
    FloatingActionButton(
      onPressed: _onNotificationsPressed,
      child: const Icon(Icons.notifications),
    ),
    if (KxPrexSender.badges.unread > 0)
      Positioned(
        right: 0,
        top: 0,
        child: Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: Colors.red,
            borderRadius: BorderRadius.circular(8),
          ),
          constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
          child: Text(
            '${KxPrexSender.badges.unread}',
            style: const TextStyle(color: Colors.white, fontSize: 10),
            textAlign: TextAlign.center,
          ),
        ),
      ),
  ],
)
```

---

## 5. Authentication

### 5.1 Basic Token Provider

```dart
KxPrexSender.setRequestHeadersProvider(() async {
  final prefs = await SharedPreferences.getInstance();
  final token = prefs.getString('auth_token') ?? '';

  return {
    'Authorization': 'Bearer $token',
  };
});
```

### 5.2 Dynamic Token Refresh

```dart
class AuthService {
  static Future<Map<String, String>> Function() getHeadersProvider() {
    return () async {
      final token = await _getValidToken();
      final userId = await _getCurrentUserId();

      return {
        'Authorization': 'Bearer $token',
        'X-User-ID': userId,
        'X-Client-Version': _getAppVersion(),
      };
    };
  }

  static Future<String> _getValidToken() async {
    final prefs = await SharedPreferences.getInstance();
    var token = prefs.getString('auth_token');

    if (token == null || _isTokenExpired(token)) {
      token = await _refreshAuthToken();
      await prefs.setString('auth_token', token);
    }

    return token;
  }

  static bool _isTokenExpired(String token) {
    // Decode JWT and check expiry
    return false;
  }

  static Future<String> _refreshAuthToken() async {
    // Call your auth API
    return 'new_token';
  }
}

// Usage
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  KxPrexSender.setRequestHeadersProvider(AuthService.getHeadersProvider());

  await KxPrexSender.initialize(
    KxPrexSenderConfig(
      backendUrl: 'https://api.example.com',
      appId: 'com.example.app',
    ),
  );

  runApp(const MyApp());
}
```

### 5.3 Firebase Auth Integration

```dart
import 'package:firebase_auth/firebase_auth.dart';

class FirebaseAuthService {
  static Future<Map<String, String>> Function() getHeadersProvider() {
    return () async {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        throw Exception('User not authenticated');
      }

      final idToken = await user.getIdToken();

      return {
        'Authorization': 'Bearer $idToken',
        'X-User-ID': user.uid,
      };
    };
  }
}

// Usage
void main() async {
  // After Firebase Auth sign-in
  KxPrexSender.setRequestHeadersProvider(FirebaseAuthService.getHeadersProvider());

  await KxPrexSender.initialize(
    KxPrexSenderConfig(
      backendUrl: 'https://api.example.com',
      appId: 'com.example.app',
    ),
  );
}
```

---

## 6. Background Handling

### 6.1 Complete Background Handler Setup

```dart
// main.dart
import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:kxprexsender/kxprexsender.dart';

void main() {
  // Set up background handler BEFORE runApp
  FirebaseMessaging.onBackgroundMessage(kxPrexBackgroundHandler);

  runApp(const MyApp());
}

// Must be top-level function
@pragma('vm:entry-point')
Future<void> kxPrexBackgroundHandler(RemoteMessage message) async {
  // Initialize SDK (required for background access)
  await KxPrexSender.initialize(
    KxPrexSenderConfig(
      backendUrl: 'https://api.yourbackend.com',
      appId: 'com.yourcompany.yourapp',
      autoRegister: false, // Already registered
    ),
  );

  // Parse and handle notification
  final notification = KxPrexSender().parseBackgroundMessage(message);

  if (notification != null) {
    // Update badges silently
    if (notification.badge) {
      await KxPrexSender.refreshBadges();
    }

    // You can show local notification here if needed
    // (SDK doesn't do this by design)
  }
}
```

### 6.2 iOS Background Modes

Add to `ios/Runner/Info.plist`:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>fetch</string>
    <string>remote-notification</string>
</array>
```

### 6.3 Handling Notification Taps

```dart
class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: const HomePage(),
      navigatorObservers: [
        NotificationNavigationObserver(),
      ],
    );
  }
}

class NotificationNavigationObserver extends NavigatorObserver {
  @override
  void didPush(Route route, Route? previousRoute) {
    super.didPush(route, previousRoute);

    // Check if we navigated from a notification
    // You can store the notification data when app launches
  }
}

// Listen for notification taps
FirebaseMessaging.onMessageOpenedApp.listen((message) {
  final data = message.data;
  final type = data['type'] ?? '';
  final chatId = data['chatId'] ?? '';

  switch (type) {
    case 'chat':
      navigatorKey.currentState?.pushNamed('/chat/$chatId');
      break;
    case 'forum':
      navigatorKey.currentState?.pushNamed('/forum/$chatId');
      break;
    default:
      navigatorKey.currentState?.pushNamed('/notifications');
  }
});
```

---

## 7. Advanced Usage

### 7.1 Notification Categories with Actions

```dart
class NotificationActionHandler {
  static void setup() {
    KxPrexSender.onMessage((notification) {
      final action = notification.data['action'] ?? '';

      switch (action) {
        case 'open_chat':
          _openChat(notification.data['chatId']);
          break;
        case 'mark_read':
          _markAsRead(notification.data['notificationId']);
          break;
        case 'dismiss':
          _dismissNotification(notification.data['notificationId']);
          break;
      }
    });
  }

  static void _openChat(String chatId) {
    navigatorKey.currentState?.pushNamed('/chat/$chatId');
  }

  static Future<void> _markAsRead(String notificationId) async {
    // Call your backend API
    await http.post(
      Uri.parse('https://api.example.com/notifications/$notificationId/read'),
    );

    // Refresh local badges
    await KxPrexSender.refreshBadges();
  }

  static void _dismissNotification(String notificationId) {
    // Handle dismissal
  }
}
```

### 7.2 Offline Handling

```dart
class OfflineNotificationQueue {
  static const String _queueKey = 'notification_queue';

  static Future<void> queueNotification(KxPrexNotification notification) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = prefs.getStringList(_queueKey) ?? [];

    queue.add(jsonEncode(notification.toJson()));
    await prefs.setStringList(_queueKey, queue);
  }

  static Future<void> processQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final queue = prefs.getStringList(_queueKey) ?? [];

    for (final item in queue) {
      final notification = KxPrexNotification.fromJson(jsonDecode(item));
      _processNotification(notification);
    }

    await prefs.remove(_queueKey);
  }

  static void _processNotification(KxPrexNotification notification) {
    // Show local notification or update UI
  }
}

// Use in onMessage when offline
KxPrexSender.onMessage((notification) async {
  final isOnline = await _checkOnlineStatus();

  if (isOnline) {
    _processNotification(notification);
  } else {
    await OfflineNotificationQueue.queueNotification(notification);
  }
});
```

### 7.3 Notification deduplication

```dart
class NotificationDeduplicator {
  static final Set<String> _processedIds = {};
  static const Duration _window = Duration(minutes: 5);

  static bool shouldProcess(String notificationId) {
    final now = DateTime.now();

    // Clean old entries
    _processedIds.removeWhere((id) {
      final timestamp = _extractTimestamp(id);
      return now.difference(timestamp) > _window;
    });

    // Check if already processed
    if (_processedIds.contains(notificationId)) {
      return false;
    }

    _processedIds.add(notificationId);
    return true;
  }

  static DateTime _extractTimestamp(String id) {
    // Extract timestamp from notification ID
    return DateTime.now();
  }
}

// Usage
KxPrexSender.onMessage((notification) {
  final id = notification.data['notificationId'] ?? notification.data['messageId'];

  if (!NotificationDeduplicator.shouldProcess(id)) {
    return;
  }

  _processNotification(notification);
});
```

### 7.4 Custom Notification Display

```dart
class CustomNotificationDisplay {
  static void show(KxPrexNotification notification) {
    // Using flutter_local_notifications
    flutterLocalNotificationsPlugin.show(
      notification.hashCode,
      notification.title,
      notification.body,
      platformChannelSpecifics,
      payload: jsonEncode(notification.toJson()),
    );
  }

  static const platformChannelSpecifics = NotificationDetails(
    android: AndroidNotificationDetails(
      'notifications',
      'Notifications',
      channelDescription: 'App notifications',
      importance: Importance.max,
      priority: Priority.high,
    ),
    iOS: DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    ),
  );
}
```

---

## 8. Backend Payload Examples

### 8.1 Normal Notification (notify: true, badge: true)

```json
{
  "notification": {
    "title": "New Message",
    "body": "You have a new message from John"
  },
  "data": {
    "type": "chat",
    "chatId": "12345",
    "senderId": "john_doe",
    "senderName": "John Doe",
    "messagePreview": "Hey, how are you?",
    "badges_unread": "6",
    "badges_read": "10",
    "kx_badge_enabled": "true",
    "kx_notify": "true"
  }
}
```

### 8.2 Silent Badge Update (notify: false, badge: true)

```json
{
  "data": {
    "type": "sync",
    "badges_unread": "5",
    "badges_read": "11",
    "kx_badge_enabled": "true",
    "kx_notify": "false"
  }
}
```

### 8.3 Notification Only (notify: true, badge: false)

```json
{
  "notification": {
    "title": "System Maintenance",
    "body": "Scheduled maintenance in 1 hour"
  },
  "data": {
    "type": "admin",
    "maintenanceId": "maint_123",
    "scheduledTime": "2024-01-15T14:00:00Z",
    "kx_badge_enabled": "false",
    "kx_notify": "true"
  }
}
```

### 8.4 Forum Notification

```json
{
  "notification": {
    "title": "New Reply",
    "body": "Alice replied to your thread"
  },
  "data": {
    "type": "forum",
    "threadId": "thread_456",
    "replyId": "reply_789",
    "authorName": "Alice",
    "threadTitle": "How to use KxPrexSender?",
    "replyPreview": "Here's how you do it...",
    "badges_unread": "7",
    "badges_read": "10",
    "kx_badge_enabled": "true",
    "kx_notify": "true"
  }
}
```

---

## 9. Testing Guide

### 9.1 Unit Tests

```dart
import 'package:test/test.dart';
import 'package:kxprexsender/kxprexsender.dart';

void main() {
  group('KxPrexNotification', () {
    test('should parse notification correctly', () {
      final notification = KxPrexNotification(
        title: 'Test Title',
        body: 'Test Body',
        type: 'chat',
        data: {'chatId': '123'},
      );

      expect(notification.title, 'Test Title');
      expect(notification.body, 'Test Body');
      expect(notification.type, 'chat');
      expect(notification.notify, true);
      expect(notification.badge, true);
    });

    test('should create copy with modified values', () {
      final original = KxPrexNotification(
        title: 'Original',
        body: 'Body',
        type: 'chat',
        data: {},
      );

      final modified = original.copyWith(
        title: 'Modified',
        notify: false,
      );

      expect(modified.title, 'Modified');
      expect(modified.body, 'Body');
      expect(modified.notify, false);
    });
  });

  group('KxPrexBadges', () {
    test('should create badges from json', () {
      final json = {'unread': 5, 'read': 10};
      final badges = KxPrexBadges.fromJson(json);

      expect(badges.unread, 5);
      expect(badges.read, 10);
    });

    test('should convert badges to json', () {
      const badges = KxPrexBadges(unread: 3, read: 7);
      final json = badges.toJson();

      expect(json['unread'], 3);
      expect(json['read'], 7);
    });
  });
}
```

### 9.2 Integration Test

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:kxprexsender/kxprexsender.dart';

void main() {
  group('KxPrexSender Integration', () {
    setUpAll(() async {
      await KxPrexSender.initialize(
        KxPrexSenderConfig(
          backendUrl: 'https://api.test.com',
          appId: 'com.test.app',
          autoRegister: false,
        ),
      );
    });

    test('should get token', () async {
      final token = await KxPrexSender.getToken();
      expect(token, isNotNull);
    });

    test('should register device', () async {
      final success = await KxPrexSender.registerDevice();
      expect(success, isTrue);
    });

    test('should have badges stream', () {
      final stream = KxPrexSender.badges.stream;
      expect(stream, isNotNull);
    });
  });
}
```

---

## 10. Common Issues & Solutions

### Issue: Initialization Error

**Error:** `StateError: KxPrexSender not initialized`

**Solution:** Ensure `KxPrexSender.initialize()` is called before any other SDK methods.

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await KxPrexSender.initialize(config);

  runApp(const MyApp());
}
```

### Issue: Notifications Not Received

**Possible causes:**
1. Missing FCM configuration
2. Incorrect backend URL
3. Auth headers not set
4. Device not registered

**Solution:**

```dart
// Debug: Check if SDK is initialized
print('Initialized: ${KxPrexSender.isInitialized}');

// Debug: Get FCM token
final token = await KxPrexSender.getToken();
print('Token: $token');

// Debug: Check badge state
print('Badges: ${KxPrexSender.badges.current}');

// Debug: Manual re-registration
await KxPrexSender.registerDevice();
```

### Issue: Token Not Registered

**Error:** Device not receiving notifications

**Solution:**

```dart
// Force re-registration
await KxPrexSender.registerDevice();

// Or manually call with force flag
final success = await _registrar.register(token, force: true);
```

### Issue: Badge Counts Not Updating

**Possible causes:**
1. Backend not returning correct counts
2. Badge data not in push payload
3. Effects flags not set correctly

**Solution:**

```dart
// Manual refresh
await KxPrexSender.refreshBadges();

// Check current state
final badges = KxPrexSender.badges.current;
print('Unread: ${badges.unread}, Read: ${badges.read}');

// Verify backend endpoint
final response = await http.get(
  Uri.parse('https://api.example.com/kxprexsender/badges'),
  headers: await _getHeaders(),
);
print('Response: ${response.body}');
```

### Issue: iOS Permission Denied

**Error:** Notifications not working on iOS

**Solution:**

```dart
// Request permission explicitly
final settings = await FirebaseMessaging.instance.requestPermission(
  alert: true,
  badge: true,
  sound: true,
  provisional: false,
);

if (settings.authorizationStatus == AuthorizationStatus.denied) {
  // Guide user to settings
  _showPermissionSettingsDialog();
}
```

---

## 📚 Additional Resources

- [API Documentation](https://pub.dev/documentation/kxprexsender)
- [Firebase Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Flutter Notifications](https://docs.flutter.dev/platform-and-widgets/notifications)

---

**Document Version:** 1.0.0
**Last Updated:** February 2026
