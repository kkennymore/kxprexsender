import 'dart:async';
import 'dart:io';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../models/index.dart';
import '../badges/index.dart';
import '../messaging/index.dart';
import '../core/api.dart';
import '../core/registrar.dart';
import '../core/analytics.dart';
import 'local_notifications.dart';
import 'offline_queue.dart';

/// Main class for KxPrexSender SDK.
///
/// Provides a single entry point for all notification functionality.
///
/// ## Usage
///
/// ```dart
/// void main() async {
///   WidgetsFlutterBinding.ensureInitialized();
///
///   await KxPrexSender.initialize(
///     KxPrexSenderConfig(
///       backendUrl: 'https://api.example.com',
///       appId: 'com.example.app',
///     ),
///   );
///
///   KxPrexSender.onMessage((notification) {
///     print('Received: ${notification.title}');
///   });
///
///   runApp(MyApp());
/// }
/// ```
class KxPrexSender {
  static final KxPrexSender _instance = KxPrexSender._internal();

  factory KxPrexSender() {
    return _instance;
  }

  KxPrexSender._internal();

  static late final ApiService _api;
  static late final BadgeStore _badgeStore;
  static late final Registrar _registrar;
  static late final FcmAdapter _fcmAdapter;
  static late final LocalNotificationService _localNotifications;
  static late final OfflineQueue _offlineQueue;
  static late final AnalyticsService _analytics;

  static bool _initialized = false;

  /// Initializes the SDK.
  ///
  /// This must be called before any other SDK methods.
  ///
  /// [config] Configuration options for the SDK.
  ///
  /// Throws [StateError] if already initialized.
  static Future<void> initialize(KxPrexSenderConfig config) async {
    if (_initialized) {
      throw StateError('KxPrexSender already initialized');
    }

    _api = ApiService();
    _badgeStore = BadgeStore();
    _registrar = Registrar(_api);
    _fcmAdapter = FcmAdapter(_api, _badgeStore);
    _localNotifications = LocalNotificationService();
    _offlineQueue = OfflineQueue();
    _analytics = AnalyticsService();

    await _api.configure(
      backendUrl: config.backendUrl,
      appId: config.appId,
    );

    await _badgeStore.init();
    await _offlineQueue.initialize();

    _initialized = true;
  }

  /// Sets up a callback for foreground notifications.
  ///
  /// [callback] Function to call when a notification is received
  /// while the app is in the foreground.
  static void onMessage(void Function(KxPrexNotification) callback) {
    _assertInitialized();
    _fcmAdapter.foregroundStream.listen((notification) {
      if (notification.notify) {
        _analytics.trackReceived(
          notificationId: DateTime.now().millisecondsSinceEpoch.toString(),
          type: notification.type,
          data: notification.data,
        );
        callback(notification);
      }
    });
  }

  /// Stream of foreground notifications.
  ///
  /// Alternative to [onMessage] callback for more control.
  static Stream<KxPrexNotification> get onMessageStream {
    _assertInitialized();
    return _fcmAdapter.foregroundStream.where((n) => n.notify);
  }

  /// Access to badge management.
  ///
  /// Provides:
  /// - [unread] Current unread count
  /// - [read] Current read count
  /// - [stream] Reactive stream of badge updates
  static KxPrexBadgeController get badges {
    _assertInitialized();
    return KxPrexBadgeController(_badgeStore);
  }

  /// Access to local notifications.
  static LocalNotificationService get localNotifications {
    _assertInitialized();
    return _localNotifications;
  }

  /// Access to offline queue.
  static OfflineQueue get queue {
    _assertInitialized();
    return _offlineQueue;
  }

  /// Access to analytics.
  static AnalyticsService get analytics {
    _assertInitialized();
    return _analytics;
  }

  /// Sets a provider for custom request headers.
  ///
  /// Use this to inject authentication headers for all API calls.
  static void setRequestHeadersProvider(
      Future<Map<String, String>> Function() provider) {
    _assertInitialized();
    _api.setHeadersProvider(provider);
  }

  /// Gets the current FCM token.
  static Future<String?> getToken() async {
    _assertInitialized();
    return _fcmAdapter.getToken();
  }

  /// Manually registers the device with the backend.
  ///
  /// Only needed if [autoRegister] was set to false in config.
  ///
  /// Returns true if registration succeeded.
  static Future<bool> registerDevice() async {
    _assertInitialized();
    final token = await _fcmAdapter.getToken();
    if (token == null) {
      return false;
    }
    return await _registrar.register(token);
  }

  /// Refreshes badge counts from the backend.
  static Future<void> refreshBadges() async {
    _assertInitialized();
    final badges = await _api.fetchBadges();
    if (badges != null) {
      _badgeStore.set(badges);
      _analytics.trackBadgeUpdate(
        unread: badges.unread,
        read: badges.read,
        reason: 'manual_refresh',
      );
    }
  }

  /// Shows a local notification.
  static Future<int> showLocalNotification({
    required String id,
    required String title,
    required String body,
    required String channelId,
    String? payload,
    KxPrexNotificationSound? sound,
    List<KxPrexNotificationAction>? actions,
    DateTime? scheduledTime,
  }) async {
    _assertInitialized();
    return _localNotifications.show(
      id: id,
      title: title,
      body: body,
      channelId: channelId,
      payload: payload,
      sound: sound,
      actions: actions,
      scheduledTime: scheduledTime,
    );
  }

  /// Cancels a local notification.
  static Future<void> cancelLocalNotification(int id) async {
    _assertInitialized();
    await _localNotifications.cancel(id);
  }

  /// Cancels all local notifications.
  static Future<void> cancelAllLocalNotifications() async {
    _assertInitialized();
    await _localNotifications.cancelAll();
  }

  /// Sets the app badge count.
  static Future<void> setBadgeCount(int count) async {
    _assertInitialized();
    await _localNotifications.badge(count);
  }

  /// Clears the app badge.
  static Future<void> clearBadge() async {
    _assertInitialized();
    await _localNotifications.clearBadge();
  }

  /// Gets the background message handler.
  ///
  /// Call this function and register the result with Firebase:
  ///
  /// ```dart
  /// FirebaseMessaging.onBackgroundMessage(
  ///   KxPrexSender.backgroundHandler,
  /// );
  /// ```
  static Future<void> Function(RemoteMessage) get backgroundHandler {
    _assertInitialized();
    return _fcmAdapter.getBackgroundHandler();
  }

  /// Listens for notification taps (both foreground and background).
  static Stream<NotificationResponse> get onNotificationTapped {
    _assertInitialized();
    return _localNotifications.onNotificationTapped;
  }

  /// Configures notification channels.
  static Future<void> configureChannels(
    List<KxPrexNotificationChannel> channels,
  ) async {
    _assertInitialized();
    await _localNotifications.initialize(
      channels: channels,
    );
  }

  /// Tracks a notification as opened.
  static void trackNotificationOpened({
    required String notificationId,
    required String type,
    String? actionId,
  }) {
    _assertInitialized();
    _analytics.trackOpened(
      notificationId: notificationId,
      type: type,
      actionId: actionId,
    );
  }

  /// Tracks a notification action.
  static void trackNotificationAction({
    required String notificationId,
    required String type,
    required String actionId,
  }) {
    _assertInitialized();
    _analytics.trackAction(
      notificationId: notificationId,
      type: type,
      actionId: actionId,
    );
  }

  /// Gets analytics for the current session.
  static Future<Map<String, dynamic>> getSessionAnalytics() async {
    _assertInitialized();
    return _analytics.getSessionAnalytics();
  }

  /// Whether the SDK has been initialized.
  static bool get isInitialized => _initialized;

  static void _assertInitialized() {
    if (!_initialized) {
      throw StateError(
          'KxPrexSender not initialized. Call KxPrexSender.initialize() first.');
    }
  }

  /// Cleans up resources.
  static void dispose() {
    _fcmAdapter.dispose();
    _badgeStore.dispose();
    _localNotifications.dispose();
    _offlineQueue.dispose();
    _analytics.dispose();
  }
}
