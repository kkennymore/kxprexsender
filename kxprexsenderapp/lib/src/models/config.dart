/// Configuration options for KxPrexSender.
///
/// Contains all settings required to initialize the notification SDK.
class KxPrexSenderConfig {
  /// The base URL of your backend API.
  ///
  /// This URL will be used for device registration and badge synchronization.
  /// Example: 'https://api.example.com'
  final String backendUrl;

  /// Your application identifier.
  ///
  /// This is used to identify the app when registering devices.
  /// Example: 'com.example.app'
  final String appId;

  /// Whether to automatically register the device on initialization.
  ///
  /// When true, the SDK will:
  /// 1. Request notification permissions
  /// 2. Get the FCM token
  /// 3. Register the device with the backend
  ///
  /// When false, you must call [KxPrexSender.registerDevice] manually.
  ///
  /// Defaults to `true`.
  final bool autoRegister;

  /// Creates a new configuration instance.
  ///
  /// [backendUrl] and [appId] are required parameters.
  const KxPrexSenderConfig({
    required this.backendUrl,
    required this.appId,
    this.autoRegister = true,
  });

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is KxPrexSenderConfig &&
        other.backendUrl == backendUrl &&
        other.appId == appId &&
        other.autoRegister == autoRegister;
  }

  @override
  int get hashCode => Object.hash(backendUrl, appId, autoRegister);

  @override
  String toString() {
    return 'KxPrexSenderConfig(backendUrl: $backendUrl, appId: $appId, autoRegister: $autoRegister)';
  }
}
