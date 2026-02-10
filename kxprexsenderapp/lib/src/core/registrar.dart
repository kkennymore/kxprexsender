import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/index.dart';
import 'api.dart';

/// Handles device registration with the backend.
///
/// Responsible for:
/// - Storing the last successfully registered token
/// - Retrying registration on failure
/// - Tracking registration state
class Registrar {
  static const String _prefsTokenKey = 'kxprex_registration_token';
  static const String _prefsLastRegKey = 'kxprex_last_registration';

  final ApiService _api;
  String _currentPlatform = '';

  /// Creates a new registrar instance.
  Registrar(this._api);

  /// Configures the registrar with platform information.
  void configure({required String platform}) {
    _currentPlatform = platform;
  }

  /// Attempts to register the device with the backend.
  ///
  /// [token] The FCM push token to register.
  /// [force] Whether to force registration even if token hasn't changed.
  ///
  /// Returns true if registration succeeded.
  Future<bool> register(String token, {bool force = false}) async {
    final lastToken = await _getLastToken();
    final lastRegTime = await _getLastRegTime();

    if (!force && token == lastToken && lastRegTime != null) {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      final now = DateTime.now().millisecondsSinceEpoch;

      if (now - lastRegTime < thirtyDaysMs) {
        return true;
      }
    }

    final success = await _api.registerDevice(
      token: token,
      platform: _currentPlatform,
    );

    if (success) {
      await _setLastToken(token);
      await _setLastRegTime();
    }

    return success;
  }

  /// Gets the last successfully registered token.
  Future<String?> _getLastToken() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_prefsTokenKey);
    } catch (e) {
      return null;
    }
  }

  Future<void> _setLastToken(String token) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefsTokenKey, token);
    } catch (e) {
      // Silently fail
    }
  }

  Future<int?> _getLastRegTime() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getInt(_prefsLastRegKey);
    } catch (e) {
      return null;
    }
  }

  Future<void> _setLastRegTime() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_prefsLastRegTime, DateTime.now().millisecondsSinceEpoch);
    } catch (e) {
      // Silently fail
    }
  }

  /// Clears the registration state.
  Future<void> clear() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_prefsTokenKey);
      await prefs.remove(_prefsLastRegKey);
    } catch (e) {
      // Silently fail
    }
  }
}
