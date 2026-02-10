import 'dart:async';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../models/index.dart';

enum NotificationActionType { open, reply, destructive }

class KxPrexNotificationAction {
  final String id;
  final String title;
  final NotificationActionType type;
  final String? icon;
  final String? inputPlaceholder;
  final bool requiresAuth;

  const KxPrexNotificationAction({
    required this.id,
    required this.title,
    required this.type,
    this.icon,
    this.inputPlaceholder,
    this.requiresAuth = false,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'type': type.toString().split('.').last,
      'icon': icon,
      'inputPlaceholder': inputPlaceholder,
      'requiresAuth': requiresAuth,
    };
  }

  factory KxPrexNotificationAction.fromMap(Map<String, dynamic> map) {
    return KxPrexNotificationAction(
      id: map['id'] as String,
      title: map['title'] as String,
      type: NotificationActionType.values.firstWhere(
        (e) => e.toString() == 'NotificationActionType.${map['type']}',
        orElse: () => NotificationActionType.open,
      ),
      icon: map['icon'] as String?,
      inputPlaceholder: map['inputPlaceholder'] as String?,
      requiresAuth: map['requiresAuth'] as bool? ?? false,
    );
  }
}

enum Importance { low, defaultImportance, high, critical }

class KxPrexNotificationChannel {
  final String id;
  final String name;
  final String description;
  final Importance importance;
  final bool enableLights;
  final bool enableVibration;
  final String? ledColor;
  final String? sound;
  final bool showBadge;
  final String? groupId;
  final List<KxPrexNotificationAction>? actions;

  const KxPrexNotificationChannel({
    required this.id,
    required this.name,
    required this.description,
    this.importance = Importance.defaultImportance,
    this.enableLights = true,
    this.enableVibration = true,
    this.ledColor,
    this.sound,
    this.showBadge = true,
    this.groupId,
    this.actions,
  });

  AndroidNotificationChannel toAndroidChannel() {
    return AndroidNotificationChannel(
      id,
      name,
      description: description,
      importance: _mapImportance(importance),
      enableLights: enableLights,
      enableVibration: enableVibration,
      ledColor: ledColor != null ? _hexToColor(ledColor!) : null,
      showBadge: showBadge,
      groupId: groupId,
    );
  }

  IOSNotificationChannel? toIOSChannel() {
    return IOSNotificationChannel(
      id,
      name,
      description: description,
      presentAlert: importance.index >= Importance.defaultImportance.index,
      presentBadge: showBadge,
      presentSound: sound != null,
    );
  }

  Importance _mapImportance(Importance importance) {
    switch (importance) {
      case Importance.low:
        return Importance.low;
      case Importance.defaultImportance:
        return Importance.defaultImportance;
      case Importance.high:
        return Importance.high;
      case Importance.critical:
        return Importance.critical;
    }
  }

  static int _hexToColor(String hexColor) {
    final hex = hexColor.replaceFirst('#', '');
    return int.parse(hex, radix: 16) + 0xFF000000;
  }
}

class KxPrexNotificationSound {
  final String? customSound;
  final bool enableVibration;
  final bool playsSound;
  final Duration? vibrationDuration;
  final List<int>? vibrationPattern;

  const KxPrexNotificationSound({
    this.customSound,
    this.enableVibration = true,
    this.playsSound = true,
    this.vibrationDuration,
    this.vibrationPattern,
  });

  IOSNotificationSound? get iOSSound {
    if (customSound != null) {
      return IOSNotificationSound(
        sound: customSound!,
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );
    }
    return null;
  }
}

typedef NotificationTapCallback = void Function(
  String? actionId,
  Map<String, String> data,
);

typedef NotificationCallback = void Function(int id, KxPrexNotification notification);

class LocalNotificationService {
  static final LocalNotificationService _instance =
      LocalNotificationService._internal();

  factory LocalNotificationService() {
    return _instance;
  }

  LocalNotificationService._internal();

  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();

  final StreamController<int> _notificationReceivedController =
      StreamController<int>.broadcast();

  final StreamController<NotificationResponse> _notificationTappedController =
      StreamController<NotificationResponse>.broadcast();

  List<KxPrexNotificationChannel> _channels = [];
  Map<String, KxPrexNotificationAction> _actions = {};
  NotificationTapCallback? _onTap;
  NotificationCallback? _onNotificationReceived;

  List<int> _pendingNotificationIds = [];

  Stream<int> get onNotificationReceived =>
      _notificationReceivedController.stream;

  Stream<NotificationResponse> get onNotificationTapped =>
      _notificationTappedController.stream;

  Future<void> initialize({
    required List<KxPrexNotificationChannel> channels,
    NotificationTapCallback? onTap,
    NotificationCallback? onNotificationReceived,
  }) async {
    _channels = channels;
    _onTap = onTap;
    _onNotificationReceived = onNotificationReceived;

    for (final channel in channels) {
      _actions.addAll({
        for (final action in channel.actions ?? []) action.id: action,
      });
    }

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _notifications.initialize(
      settings,
      onDidReceiveNotificationResponse: _onDidReceiveNotificationResponse,
      onDidReceiveBackgroundNotificationResponse:
          _onDidReceiveBackgroundNotificationResponse,
    );

    for (final channel in channels) {
      _notifications
          .resolvePlatformSpecificImplementation<
              IOSFlutterLocalNotificationsPlugin>()
          ?.requestPermissions(
            alert: true,
            badge: true,
            sound: true,
          );

      _notifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel.toAndroidChannel());
    }
  }

  void _onDidReceiveNotificationResponse(NotificationResponse response) {
    final payload = _parsePayload(response.payload);
    _notificationTappedController.add(response);

    _onTap?.call(
      response.actionId,
      payload,
    );
  }

  void _onDidReceiveBackgroundNotificationResponse(
    NotificationResponse response,
  ) {
    final payload = _parsePayload(response.payload);
    _notificationTappedController.add(response);

    _onTap?.call(
      response.actionId,
      payload,
    );
  }

  Map<String, String> _parsePayload(String? payload) {
    if (payload == null || payload.isEmpty) return {};

    try {
      final decoded = Uri.parse(payload.replaceAll(' ', '+'));
      final params = decoded.queryParameters;
      return Map<String, String>.from(params);
    } catch (e) {
      return {'raw': payload};
    }
  }

  Future<int> show({
    required String id,
    required String title,
    required String body,
    required String channelId,
    String? payload,
    KxPrexNotificationSound? sound,
    List<KxPrexNotificationAction>? actions,
    String? largeIcon,
    String? bigPicture,
    int? progress,
    bool? ongoing,
    String? category,
    DateTime? scheduledTime,
    RepeatInterval? repeatInterval,
  }) async {
    final channel = _channels.firstWhere(
      (c) => c.id == channelId,
      orElse: () => _channels.first,
    );

    final androidDetails = AndroidNotificationDetails(
      channel.id,
      channel.name,
      channel.description,
      importance: _mapImportance(channel.importance),
      priority: _mapPriority(channel.importance),
      enableLights: channel.enableLights,
      enableVibration: channel.enableVibration,
      ledColor: channel.ledColor != null ? _hexToColor(channel.ledColor!) : null,
      showBadge: channel.showBadge,
      groupKey: channel.groupId,
      icon: largeIcon,
      largeIcon: largeIcon != null ? BigPictureStyleInformation(
        BigPictureStyleInformation(
          ByteResourceAndroidNotification('large_icon'),
        ),
      ) : null,
      styleInformation: bigPicture != null
          ? BigPictureStyleInformation(
              ByteResourceAndroidNotification('big_picture'),
            )
          : null,
      progress: progress,
      ongoing: ongoing ?? false,
      autoCancel: !(ongoing ?? false),
      sound: sound?.customSound,
    );

    final iosDetails = DarwinNotificationDetails(
      presentAlert: channel.importance.index >= Importance.defaultImportance.index,
      presentBadge: channel.showBadge,
      presentSound: sound?.playsSound ?? true,
      sound: sound?.customSound,
      attachments: largeIcon != null
          ? [DarwinNotificationAttachment(largeIcon)]
          : null,
    );

    final details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    if (scheduledTime != null) {
      return _notifications.zonedSchedule(
        int.parse(id),
        title,
        body,
        _nextInstance(scheduledTime, repeatInterval),
        details,
        payload: _buildPayload(payload, {}),
        androidAllowWhileIdle: true,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
      );
    }

    return _notifications.show(
      int.parse(id),
      title,
      body,
      details,
      payload: _buildPayload(payload, {}),
    );
  }

  Future<int> showFromNotification(
    KxPrexNotification notification,
    String channelId, {
    String? payload,
    KxPrexNotificationSound? sound,
    List<KxPrexNotificationAction>? actions,
  }) async {
    final channel = _channels.firstWhere(
      (c) => c.id == channelId,
      orElse: () => _channels.first,
    );

    final androidActions = (actions ?? channel.actions ?? []).map((action) {
      return AndroidNotificationAction(
        action.id,
        action.title,
        icon: action.icon,
        type: _mapActionType(action.type),
        inputs: action.type == NotificationActionType.reply
            ? [
                AndroidNotificationActionInput(
                  'reply',
                  action.inputPlaceholder ?? 'Reply',
                  true,
                ),
              ]
            : [],
      );
    }).toList();

    final androidDetails = AndroidNotificationDetails(
      channel.id,
      channel.name,
      channel.description,
      importance: _mapImportance(channel.importance),
      priority: _mapPriority(channel.importance),
      enableLights: channel.enableLights,
      enableVibration: channel.enableVibration,
      actions: androidActions,
    );

    final iosActions = (actions ?? channel.actions ?? []).map((action) {
      return DarwinNotificationAction(
        action.id,
        action.title,
        options: _mapIOSActionOptions(action.type),
      );
    }).toList();

    final iosDetails = DarwinNotificationDetails(
      presentAlert: channel.importance.index >= Importance.defaultImportance.index,
      presentBadge: channel.showBadge,
      presentSound: sound?.playsSound ?? true,
      categoryIdentifier: notification.type,
      attachments: null,
    );

    final details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    final id = notification.hashCode.abs() % 2147483647;

    _notificationReceivedController.add(id);

    return _notifications.show(
      id,
      notification.title,
      notification.body,
      details,
      payload: _buildPayload(payload, notification.data),
    );
  }

  String _buildPayload(String? customPayload, Map<String, String> data) {
    final payload = customPayload ?? data['notificationId'] ?? DateTime.now().millisecondsSinceEpoch.toString();
    return '$payload?${Uri(queryParameters: data).query}';
  }

  Importance _mapImportance(Importance importance) {
    switch (importance) {
      case Importance.low:
        return Importance.low;
      case Importance.defaultImportance:
        return Importance.defaultImportance;
      case Importance.high:
        return Importance.high;
      case Importance.critical:
        return Importance.critical;
    }
  }

  Priority _mapPriority(Importance importance) {
    switch (importance) {
      case Importance.low:
        return Priority.low;
      case Importance.defaultImportance:
        return Priority.defaultPriority;
      case Importance.high:
        return Priority.high;
      case Importance.critical:
        return Priority.high;
    }
  }

  AndroidNotificationActionType _mapActionType(NotificationActionType type) {
    switch (type) {
      case NotificationActionType.open:
        return AndroidNotificationActionType.opened;
      case NotificationActionType.reply:
        return AndroidNotificationActionType.textInput;
      case NotificationActionType.destructive:
        return AndroidNotificationActionType.destructive;
    }
  }

  DarwinNotificationActionOptions _mapIOSActionOptions(NotificationActionType type) {
    switch (type) {
      case NotificationActionType.open:
        return const DarwinNotificationActionOptions();
      case NotificationActionType.reply:
        return const DarwinNotificationActionOptions(
          foreground: true,
        );
      case NotificationActionType.destructive:
        return const DarwinNotificationActionOptions(
          destructive: true,
        );
    }
  }

  int _hexToColor(String hexColor) {
    final hex = hexColor.replaceFirst('#', '');
    return int.parse(hex, radix: 16) + 0xFF000000;
  }

  TZDateTime _nextInstance(DateTime time, [RepeatInterval? repeat]) {
    // Simplified - would need timezone handling in production
    return TZDateTime.from(time, local);
  }

  Future<void> cancel(int id) async {
    await _notifications.cancel(id);
    _pendingNotificationIds.remove(id);
  }

  Future<void> cancelAll() async {
    await _notifications.cancelAll();
    _pendingNotificationIds.clear();
  }

  Future<void> cancelGroup(String groupId) async {
    await _notifications.cancelGroup(groupId);
  }

  Future<List<PendingNotificationRequest>> getPendingNotifications() async {
    return _notifications.pendingNotificationRequests();
  }

  Future<void> badge(int count) async {
    await _notifications
        .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()
        ?.setBadgeCount(count);

    await _notifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.setApplicationBadgeLabel(count.toString());
  }

  Future<int> getBadge() async {
    return _notifications
            .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()
            ?.badgeCount ??
        0;
  }

  Future<void> clearBadge() async {
    await badge(0);
  }

  List<KxPrexNotificationChannel> getChannels() {
    return _channels;
  }

  Future<void> configureChannels(List<KxPrexNotificationChannel> channels) async {
    _channels = channels;

    for (final channel in channels) {
      await _notifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel.toAndroidChannel());
    }
  }

  void dispose() {
    _notificationReceivedController.close();
    _notificationTappedController.close();
  }
}
