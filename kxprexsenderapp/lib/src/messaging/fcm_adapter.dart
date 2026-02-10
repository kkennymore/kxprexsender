import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../models/index.dart';
import '../badges/index.dart';
import 'api.dart';

/// Adapter for Firebase Cloud Messaging.
///
/// Handles all FCM-related operations including:
/// - Permission requests
/// - Token management
/// - Foreground message handling
/// - Background message handling
/// - Token refresh detection
class FcmAdapter {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final ApiService _api;
  final BadgeStore _badgeStore;

  final StreamController<KxPrexNotification> _foregroundController =
      StreamController<KxPrexNotification>.broadcast();

  Function(RemoteMessage)? _backgroundHandler;

  /// Stream of foreground notifications.
  Stream<KxPrexNotification> get foregroundStream => _foregroundController.stream;

  /// Creates a new FCM adapter.
  FcmAdapter(this._api, this._badgeStore);

  /// Requests notification permissions.
  ///
  /// Returns true if permissions were granted.
  Future<bool> requestPermission() async {
    try {
      final settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: true,
      );

      return settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional;
    } catch (e) {
      return false;
    }
  }

  /// Gets the current FCM token.
  Future<String?> getToken() async {
    try {
      return await _messaging.getToken();
    } catch (e) {
      return null;
    }
  }

  /// Sets up foreground message handler.
  void setupForegroundHandler() {
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
  }

  /// Sets the background message handler.
  ///
  /// This should be called from the top-level background handler.
  void setBackgroundHandler(Function(RemoteMessage) handler) {
    _backgroundHandler = handler;
  }

  /// Gets the background handler for registration with Firebase.
  Future<void> Function(RemoteMessage) getBackgroundHandler() {
    return (message) async {
      if (_backgroundHandler != null) {
        _backgroundHandler!(message);
      }
    };
  }

  /// Sets up token refresh listener.
  void setupTokenRefresh(void Function(String token) onRefresh) {
    _messaging.onTokenRefresh.listen((token) {
      onRefresh(token);
    });
  }

  void _handleForegroundMessage(RemoteMessage message) {
    try {
      final notification = _parseMessage(message);
      if (notification != null) {
        _foregroundController.add(notification);

        if (notification.badge) {
          _updateBadgesFromMessage(message);
        }
      }
    } catch (e) {
      // Silently fail to avoid crashing the app
    }
  }

  void _updateBadgesFromMessage(RemoteMessage message) {
    try {
      final data = message.data;

      final badgeEnabled = data['kx_badge_enabled'] == 'true';
      if (!badgeEnabled) return;

      final unreadStr = data['kx_badges_unread'];
      final readStr = data['kx_badges_read'];

      if (unreadStr != null || readStr != null) {
        final unread = int.tryParse(unreadStr ?? '') ?? -1;
        final read = int.tryParse(readStr ?? '') ?? -1;

        if (unread >= 0 || read >= 0) {
          _badgeStore.set(KxPrexBadges(
            unread: unread >= 0 ? unread : _badgeStore.current.unread,
            read: read >= 0 ? read : _badgeStore.current.read,
          ));
        }
      }
    } catch (e) {
      // Silently fail
    }
  }

  /// Parses an FCM message into a KxPrexNotification.
  ///
  /// Returns null if the message cannot be parsed.
  KxPrexNotification? _parseMessage(RemoteMessage message) {
    try {
      final data = message.data;

      final notifyEnabled = data['kx_notify'] != 'false';

      final title = message.notification?.title ??
          data['title'] ??
          data['notification_title'] ??
          '';

      final body = message.notification?.body ??
          data['body'] ??
          data['notification_body'] ??
          '';

      final type = data['type'] ?? data['notification_type'] ?? '';

      final badgeEnabled = data['kx_badge_enabled'] == 'true';

      return KxPrexNotification(
        title: title,
        body: body,
        type: type,
        data: Map<String, dynamic>.from(data),
        notify: notifyEnabled,
        badge: badgeEnabled,
      );
    } catch (e) {
      return null;
    }
  }

  /// Parses a background message (called from background handler).
  KxPrexNotification? parseBackgroundMessage(RemoteMessage message) {
    return _parseMessage(message);
  }

  /// Cleans up resources.
  void dispose() {
    _foregroundController.close();
  }
}
