/// Represents a notification received from the backend.
///
/// This model normalizes the payload received from FCM into a consistent
/// format that your app can handle uniformly.
class KxPrexNotification {
  /// The notification title.
  ///
  /// Extracted from message.notification?.title or data["title"].
  final String title;

  /// The notification body text.
  ///
  /// Extracted from message.notification?.body or data["body"].
  final String body;

  /// The notification type.
  ///
  /// A string identifier that categorizes the notification.
  /// Common values: 'chat', 'admin', 'forum', 'system', etc.
  final String type;

  /// Additional custom data payload.
  ///
  /// Contains any extra key-value pairs sent from the backend.
  final Map<String, dynamic> data;

  /// Whether the notification should be shown to the user.
  ///
  /// When false, this is a silent update (e.g., badge-only sync).
  /// The SDK will not trigger [KxPrexSender.onMessage] callbacks.
  final bool notify;

  /// Whether the badge count should be updated.
  ///
  /// When true, the SDK will update badge counts based on the payload.
  final bool badge;

  /// Creates a new notification instance.
  ///
  /// All parameters are required except [notify] and [badge] which default to true.
  KxPrexNotification({
    required this.title,
    required this.body,
    required this.type,
    required this.data,
    this.notify = true,
    this.badge = true,
  });

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is KxPrexNotification &&
        other.title == title &&
        other.body == body &&
        other.type == type &&
        other.notify == notify &&
        other.badge == badge;
  }

  @override
  int get hashCode => Object.hash(title, body, type, notify, badge);

  @override
  String toString() {
    return 'KxPrexNotification(title: $title, body: $body, type: $type, '
        'notify: $notify, badge: $badge)';
  }

  /// Creates a copy of this notification with modified values.
  KxPrexNotification copyWith({
    String? title,
    String? body,
    String? type,
    Map<String, dynamic>? data,
    bool? notify,
    bool? badge,
  }) {
    return KxPrexNotification(
      title: title ?? this.title,
      body: body ?? this.body,
      type: type ?? this.type,
      data: data ?? this.data,
      notify: notify ?? this.notify,
      badge: badge ?? this.badge,
    );
  }
}
