import 'dart:async';
import 'dart:io';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../models/index.dart';
import '../badges/index.dart';
import '../messaging/index.dart';
import 'api.dart';
import 'registrar.dart';

/// Bootstrapper for initializing the KxPrexSender SDK.
///
/// Coordinates the initialization of all internal services
/// and handles the startup flow.
class Bootstrap {
  final KxPrexSenderConfig _config;
  final ApiService _api;
  final BadgeStore _badgeStore;
  final Registrar _registrar;
  final FcmAdapter _fcmAdapter;

  bool _initialized = false;
  Completer<void>? _initCompleter;

  /// Creates a new bootstrapper instance.
  Bootstrap({
    required KxPrexSenderConfig config,
    required ApiService api,
    required BadgeStore badgeStore,
    required Registrar registrar,
    required FcmAdapter fcmAdapter,
  })  : _config = config,
        _api = api,
        _badgeStore = badgeStore,
        _registrar = registrar,
        _fcmAdapter = fcmAdapter;

  /// Initializes the SDK.
  ///
  /// This method is idempotent - calling it multiple times
  /// will not re-initialize.
  ///
  /// Throws [StateError] if already initialized.
  Future<void> initialize() async {
    if (_initialized) {
      return;
    }

    if (_initCompleter != null) {
      return _initCompleter!.future;
    }

    _initCompleter = Completer<void>();

    try {
      await _performInitialization();
      _initialized = true;
      _initCompleter!.complete();
    } catch (e) {
      _initCompleter!.completeError(e);
      rethrow;
    }
  }

  Future<void> _performInitialization() async {
    final platform = _getPlatform();
    final isAndroid = platform == 'android';
    final isIOS = platform == 'ios';

    if (!isAndroid && !isIOS) {
      throw UnsupportedError('KxPrexSender only supports Android and iOS');
    }

    _api.configure(
      backendUrl: _config.backendUrl,
      appId: _config.appId,
    );

    _registrar.configure(platform: platform);

    await _badgeStore.init();

    if (isIOS) {
      final hasPermission = await _fcmAdapter.requestPermission();
      if (!hasPermission) {
        // Log but don't fail - user might have denied
      }
    }

    final token = await _fcmAdapter.getToken();
    if (token == null) {
      throw Exception('Failed to get FCM token');
    }

    _fcmAdapter.setupForegroundHandler();
    _fcmAdapter.setupTokenRefresh(_onTokenRefresh);

    if (_config.autoRegister) {
      await _registerDevice(token);
    }
  }

  String _getPlatform() {
    if (Platform.isAndroid) return 'android';
    if (Platform.isIOS) return 'ios';
    throw UnsupportedError('Unsupported platform');
  }

  Future<void> _registerDevice(String token) async {
    final success = await _registrar.register(token);

    if (!success) {
      // Retry once after a short delay
      await Future.delayed(const Duration(seconds: 2));
      await _registrar.register(token, force: true);
    }
  }

  Future<void> _onTokenRefresh(String token) async {
    await _registerDevice(token);
  }

  /// Gets the FCM token.
  Future<String?> getToken() async {
    if (!_initialized) {
      throw StateError('KxPrexSender not initialized');
    }
    return _fcmAdapter.getToken();
  }

  /// Registers the device manually.
  ///
  /// Useful when autoRegister is false.
  Future<bool> registerDevice() async {
    if (!_initialized) {
      throw StateError('KxPrexSender not initialized');
    }

    final token = await _fcmAdapter.getToken();
    if (token == null) {
      return false;
    }

    return await _registrar.register(token);
  }

  /// Refreshes badge counts from the backend.
  Future<void> refreshBadges() async {
    if (!_initialized) {
      throw StateError('KxPrexSender not initialized');
    }

    final badges = await _api.fetchBadges();
    if (badges != null) {
      _badgeStore.set(badges);
    }
  }

  /// Gets the foreground notification stream.
  Stream<KxPrexNotification> getNotificationStream() {
    return _fcmAdapter.foregroundStream;
  }

  /// Gets the background handler for Firebase registration.
  Future<void> Function(RemoteMessage) getBackgroundHandler() {
    return _fcmAdapter.getBackgroundHandler();
  }

  /// Sets a background message handler.
  void setBackgroundHandler(Function(RemoteMessage) handler) {
    _fcmAdapter.setBackgroundHandler(handler);
  }

  /// Cleans up resources.
  void dispose() {
    _fcmAdapter.dispose();
    _badgeStore.dispose();
  }
}
