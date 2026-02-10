import 'dart:async';
import '../models/index.dart';

class AnalyticsEvent {
  final String name;
  final Map<String, dynamic> parameters;
  final DateTime timestamp;

  AnalyticsEvent({
    required this.name,
    this.parameters = const {},
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'parameters': parameters,
      'timestamp': timestamp.toIso8601String(),
    };
  }
}

class NotificationAnalyticsEvent extends AnalyticsEvent {
  final String notificationId;
  final String type;

  NotificationAnalyticsEvent({
    required this.notificationId,
    required this.type,
    Map<String, dynamic> parameters = const {},
    DateTime? timestamp,
  }) : super(
          name: 'notification_event',
          parameters: {
            'notification_id': notificationId,
            'notification_type': type,
            ...parameters,
          },
          timestamp: timestamp,
        );

  factory NotificationAnalyticsEvent.received({
    required String notificationId,
    required String type,
    Map<String, dynamic>? data,
  }) {
    return NotificationAnalyticsEvent(
      notificationId: notificationId,
      type: type,
      parameters: {
        'event': 'received',
        ...data ?? {},
      },
    );
  }

  factory NotificationAnalyticsEvent.opened({
    required String notificationId,
    required String type,
    String? actionId,
    Map<String, dynamic>? metadata,
  }) {
    return NotificationAnalyticsEvent(
      notificationId: notificationId,
      type: type,
      parameters: {
        'event': 'opened',
        'action_id': actionId,
        ...metadata ?? {},
      },
    );
  }

  factory NotificationAnalyticsEvent.actionTaken({
    required String notificationId,
    required String type,
    required String actionId,
    Map<String, dynamic>? metadata,
  }) {
    return NotificationAnalyticsEvent(
      notificationId: notificationId,
      type: type,
      parameters: {
        'event': 'action',
        'action_id': actionId,
        ...metadata ?? {},
      },
    );
  }

  factory NotificationAnalyticsEvent.dismissed({
    required String notificationId,
    required String type,
    Map<String, dynamic>? metadata,
  }) {
    return NotificationAnalyticsEvent(
      notificationId: notificationId,
      type: type,
      parameters: {
        'event': 'dismissed',
        ...metadata ?? {},
      },
    );
  }
}

class BadgeAnalyticsEvent extends AnalyticsEvent {
  BadgeAnalyticsEvent({
    required int unread,
    required int read,
    String? reason,
  }) : super(
          name: 'badge_update',
          parameters: {
            'badge_unread': unread,
            'badge_read': read,
            'reason': reason,
          },
        );
}

class AnalyticsService {
  static final AnalyticsService _instance =
      AnalyticsService._internal();

  factory AnalyticsService() {
    return _instance;
  }

  AnalyticsService._internal();

  final List<AnalyticsEvent> _events = [];
  final StreamController<AnalyticsEvent> _eventController =
      StreamController<AnalyticsEvent>.broadcast();

  int _maxEvents = 100;
  bool _enabled = true;
  String? _userId;

  Stream<AnalyticsEvent> get events => _eventController.stream;

  void setUserId(String? userId) {
    _userId = userId;
  }

  void trackReceived({
    required String notificationId,
    required String type,
    Map<String, dynamic>? data,
  }) {
    if (!_enabled) return;

    final event = NotificationAnalyticsEvent.received(
      notificationId: notificationId,
      type: type,
      data: data,
    );

    _track(event);
  }

  void trackOpened({
    required String notificationId,
    required String type,
    String? actionId,
    Map<String, dynamic>? metadata,
  }) {
    if (!_enabled) return;

    final event = NotificationAnalyticsEvent.opened(
      notificationId: notificationId,
      type: type,
      actionId: actionId,
      metadata: metadata,
    );

    _track(event);
  }

  void trackAction({
    required String notificationId,
    required String type,
    required String actionId,
    Map<String, dynamic>? metadata,
  }) {
    if (!_enabled) return;

    final event = NotificationAnalyticsEvent.actionTaken(
      notificationId: notificationId,
      type: type,
      actionId: actionId,
      metadata: metadata,
    );

    _track(event);
  }

  void trackDismissed({
    required String notificationId,
    required String type,
    Map<String, dynamic>? metadata,
  }) {
    if (!_enabled) return;

    final event = NotificationAnalyticsEvent.dismissed(
      notificationId: notificationId,
      type: type,
      metadata: metadata,
    );

    _track(event);
  }

  void trackBadgeUpdate({
    required int unread,
    required int read,
    String? reason,
  }) {
    if (!_enabled) return;

    final event = BadgeAnalyticsEvent(
      unread: unread,
      read: read,
      reason: reason,
    );

    _track(event);
  }

  void trackCustomEvent(String name, [Map<String, dynamic>? parameters]) {
    if (!_enabled) return;

    _track(AnalyticsEvent(
      name: name,
      parameters: parameters ?? {},
    ));
  }

  void _track(AnalyticsEvent event) {
    _events.add(event);
    _eventController.add(event);

    if (_events.length > _maxEvents) {
      _events.removeAt(0);
    }
  }

  Future<Map<String, dynamic>> getSessionAnalytics() async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    final todayEvents = _events.where((e) => e.timestamp.isAfter(today)).toList();

    final received = todayEvents
        .where((e) =>
            e is NotificationAnalyticsEvent &&
            e.parameters['event'] == 'received')
        .length;

    final opened = todayEvents
        .where((e) =>
            e is NotificationAnalyticsEvent &&
            e.parameters['event'] == 'opened')
        .length;

    final actions = todayEvents
        .where((e) =>
            e is NotificationAnalyticsEvent &&
            e.parameters['event'] == 'action')
        .length;

    final dismissed = todayEvents
        .where((e) =>
            e is NotificationAnalyticsEvent &&
            e.parameters['event'] == 'dismissed')
        .length;

    return {
      'date': today.toIso8601String(),
      'received': received,
      'opened': opened,
      'actions': actions,
      'dismissed': dismissed,
      'openRate': received > 0 ? (opened / received * 100).toFixed(1) : 0,
      'actionRate': opened > 0 ? (actions / opened * 100).toFixed(1) : 0,
      'totalEvents': todayEvents.length,
    };
  }

  Future<Map<String, dynamic>> getNotificationTypeAnalytics(
      String type) async {
    final events = _events
        .where((e) =>
            e is NotificationAnalyticsEvent &&
            (e as NotificationAnalyticsEvent).type == type)
        .toList();

    final received =
        events.where((e) => e.parameters['event'] == 'received').length;
    final opened =
        events.where((e) => e.parameters['event'] == 'opened').length;
    final actions =
        events.where((e) => e.parameters['event'] == 'action').length;

    return {
      'type': type,
      'received': received,
      'opened': opened,
      'actions': actions,
      'openRate': received > 0 ? (opened / received * 100).toFixed(1) : 0,
    };
  }

  Future<List<AnalyticsEvent>> getEvents({
    String? name,
    DateTime? startDate,
    DateTime? endDate,
    int? limit,
  }) async {
    var events = [..._events];

    if (name != null) {
      events = events.where((e) => e.name == name).toList();
    }

    if (startDate != null) {
      events = events.where((e) => e.timestamp.isAfter(startDate)).toList();
    }

    if (endDate != null) {
      events = events.where((e) => e.timestamp.isBefore(endDate)).toList();
    }

    events.sort((a, b) => b.timestamp.compareTo(a.timestamp));

    if (limit != null && events.length > limit) {
      events = events.sublist(0, limit);
    }

    return events;
  }

  Future<void> clear() async {
    _events.clear();
  }

  Future<void> export() async {
    return _events.map((e) => e.toJson()).toList() as Future<void>;
  }

  void setEnabled(bool enabled) {
    _enabled = enabled;
  }

  int get eventCount => _events.length;

  void dispose() {
    _eventController.close();
  }
}

extension DoubleExtensions on double {
  String toFixed(int decimals) {
    return toStringAsFixed(decimals);
  }
}
