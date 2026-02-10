/// KxPrexSender - Production-ready Flutter SDK for push notifications.
///
/// This library provides a complete solution for:
/// - Push notification handling (FCM)
/// - Badge count management (read/unread)
/// - Local notifications
/// - Offline queue support
/// - Analytics tracking
/// - Device registration
/// - Backend integration
///
/// ## Quick Start
///
/// ```dart
/// import 'package:kxprexsender/kxprexsender.dart';
///
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
///
/// See [KxPrexSender] for detailed API documentation.
library;

export 'src/models/index.dart';
export 'src/badges/index.dart';
export 'src/messaging/index.dart';
export 'src/core/index.dart';
