import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../models/index.dart';

/// Service for communicating with the backend API.
///
/// Handles device registration, badge synchronization, and
/// provides a way to inject custom headers for authentication.
class ApiService {
  static const String _registerEndpoint = '/kxprexsender/devices/register';
  static const String _badgesEndpoint = '/kxprexsender/badges';

  String _backendUrl = '';
  String _appId = '';
  Map<String, String> _defaultHeaders = {};

  Future<Map<String, String>> Function()? _headersProvider;

  /// Configures the API service.
  void configure({
    required String backendUrl,
    required String appId,
  }) {
    _backendUrl = backendUrl.endsWith('/')
        ? backendUrl.substring(0, backendUrl.length - 1)
        : backendUrl;
    _appId = appId;
  }

  /// Sets the headers provider function.
  ///
  /// The provider will be called before each API request to get
  /// the current authentication headers.
  void setHeadersProvider(Future<Map<String, String>> Function() provider) {
    _headersProvider = provider;
  }

  Future<Map<String, String>> _getHeaders() async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };

    if (_headersProvider != null) {
      final customHeaders = await _headersProvider!();
      headers.addAll(customHeaders);
    }

    return headers;
  }

  String _buildUrl(String endpoint) {
    return '$_backendUrl$endpoint';
  }

  /// Registers a device with the backend.
  ///
  /// [token] The FCM push token.
  /// [platform] The device platform ('android' or 'ios').
  ///
  /// Returns true if registration succeeded.
  Future<bool> registerDevice({
    required String token,
    required String platform,
  }) async {
    final url = _buildUrl(_registerEndpoint);

    try {
      final payload = {
        'platform': platform,
        'transport': 'fcm',
        'token': token,
        'appId': _appId,
      };

      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse(url),
        headers: headers,
        body: jsonEncode(payload),
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return true;
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  /// Fetches the current badge counts from the backend.
  ///
  /// Returns the badge counts or null if the request failed.
  Future<KxPrexBadges?> fetchBadges() async {
    final url = _buildUrl(_badgesEndpoint);

    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        return KxPrexBadges.fromJson(body);
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  /// Checks if the backend is reachable.
  Future<bool> healthCheck() async {
    try {
      final url = Uri.parse(_backendUrl);
      final response = await http.get(url);
      return response.statusCode >= 200 && response.statusCode < 500;
    } catch (e) {
      return false;
    }
  }
}
