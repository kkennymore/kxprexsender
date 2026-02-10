import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';
import 'package:uuid/uuid.dart';
import '../models/index.dart';
import '../core/api.dart';

enum QueueEventType { notification, registration, sync }

enum Priority { low, normal, high, critical }

class QueueItem {
  final String id;
  final QueueEventType type;
  final Priority priority;
  final Map<String, dynamic> data;
  final int attempts;
  final DateTime createdAt;
  final DateTime? lastAttempt;
  final String? error;

  const QueueItem({
    required this.id,
    required this.type,
    required this.priority,
    required this.data,
    this.attempts = 0,
    required this.createdAt,
    this.lastAttempt,
    this.error,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'type': type.toString().split('.').last,
      'priority': priority.toString().split('.').last,
      'data': data,
      'attempts': attempts,
      'createdAt': createdAt.toIso8601String(),
      'lastAttempt': lastAttempt?.toIso8601String(),
      'error': error,
    };
  }

  factory QueueItem.fromMap(Map<String, dynamic> map) {
    return QueueItem(
      id: map['id'] as String,
      type: QueueEventType.values.firstWhere(
        (e) => e.toString() == 'QueueEventType.${map['type']}',
        orElse: () => QueueEventType.notification,
      ),
      priority: Priority.values.firstWhere(
        (e) => e.toString() == 'Priority.${map['priority']}',
        orElse: () => Priority.normal,
      ),
      data: Map<String, dynamic>.from(map['data'] as Map),
      attempts: map['attempts'] as int? ?? 0,
      createdAt: DateTime.parse(map['createdAt'] as String),
      lastAttempt:
          map['lastAttempt'] != null ? DateTime.parse(map['lastAttempt'] as String) : null,
      error: map['error'] as String?,
    );
  }
}

class QueueEvent {
  final String id;
  final QueueEventType type;
  final Map<String, dynamic> data;

  QueueEvent({String? id, required this.type, required this.data})
      : id = id ?? const Uuid().v4();

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.toString().split('.').last,
      'data': data,
    };
  }
}

typedef NetworkStatusCallback = void Function(bool isOnline);
typedef QueueProgressCallback = void Function(int processed, int total, int failed);

class OfflineQueue {
  static final OfflineQueue _instance = OfflineQueue._internal();

  factory OfflineQueue() {
    return _instance;
  }

  OfflineQueue._internal();

  Database? _database;
  final String _dbName = 'kxprex_queue.db';
  final String _tableName = 'queue_items';
  final _uuid = const Uuid();

  final StreamController<QueueEvent> _eventController =
      StreamController<QueueEvent>.broadcast();
  final StreamController<int> _progressController =
      StreamController<int>.broadcast();

  bool _isProcessing = false;
  bool _isOnline = true;
  int _maxRetries = 3;
  int _batchSize = 10;
  Duration _retryDelay = const Duration(seconds: 5);

  Stream<QueueEvent> get events => _eventController.stream;
  Stream<int> get progress => _progressController.stream;

  Future<void> initialize() async {
    await _initDatabase();
    await _createTable();

    _startConnectivityListener();
  }

  Future<void> _initDatabase() async {
    final directory = await getApplicationDocumentsDirectory();
    final path = '${directory.path}/$_dbName';

    _database = await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await _createTable();
      },
    );
  }

  Future<void> _createTable() async {
    await _database?.execute('''
      CREATE TABLE IF NOT EXISTS $_tableName (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        priority TEXT NOT NULL,
        data TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        last_attempt TEXT,
        error TEXT
      )
    ''');
  }

  void _startConnectivityListener() {}

  Future<bool> _checkNetwork() async {
    try {
      final response = await ApiService().healthCheck();
      return response;
    } catch (e) {
      return false;
    }
  }

  Future<String> add({
    required QueueEventType type,
    required Map<String, dynamic> data,
    Priority priority = Priority.normal,
  }) async {
    final item = QueueItem(
      id: _uuid.v4(),
      type: type,
      priority: priority,
      data: data,
      createdAt: DateTime.now(),
      attempts: 0,
      lastAttempt: null,
      error: null,
    );

    await _database?.insert(_tableName, item.toMap());

    _eventController.add(QueueEvent(type: type, data: data));

    if (priority == Priority.critical) {
      _processQueue();
    }

    return item.id;
  }

  Future<void> addNotification(
    KxPrexNotification notification, {
    Priority priority = Priority.normal,
  }) async {
    await add(
      type: QueueEventType.notification,
      data: {
        'title': notification.title,
        'body': notification.body,
        'type': notification.type,
        'data': notification.data,
      },
      priority: priority,
    );
  }

  Future<void> addRegistration() async {
    await add(
      type: QueueEventType.registration,
      data: {'timestamp': DateTime.now().toIso8601String()},
      priority: Priority.high,
    );
  }

  Future<void> addSync({Map<String, dynamic>? data}) async {
    await add(
      type: QueueEventType.sync,
      data: data ?? {},
      priority: Priority.low,
    );
  }

  Future<void> _processQueue() async {
    if (_isProcessing) return;

    _isOnline = await _checkNetwork();
    if (!_isOnline) return;

    _isProcessing = true;

    try {
      while (true) {
        final items = await _getNextItems(_batchSize);
        if (items.isEmpty) break;

        for (final item in items) {
          try {
            await _processItem(item);
            await _removeItem(item.id);
            _progressController.add(1);
          } catch (e) {
            await _updateItemError(item.id, e.toString());
          }
        }

        if (items.length < _batchSize) break;
      }
    } finally {
      _isProcessing = false;
    }
  }

  Future<List<QueueItem>> _getNextItems(int limit) async {
    final maps = await _database?.query(
      _tableName,
      orderBy: 'created_at ASC',
      limit: limit,
    );

    if (maps == null || maps.isEmpty) return [];

    return maps.map((m) => QueueItem.fromMap(m)).toList();
  }

  Future<void> _processItem(QueueItem item) async {
    switch (item.type) {
      case QueueEventType.notification:
        await _processNotification(item);
        break;
      case QueueEventType.registration:
        await _processRegistration(item);
        break;
      case QueueEventType.sync:
        await _processSync(item);
        break;
    }
  }

  Future<void> _processNotification(QueueItem item) async {
    final notification = KxPrexNotification(
      title: item.data['title'] ?? '',
      body: item.data['body'] ?? '',
      type: item.data['type'] ?? '',
      data: Map<String, dynamic>.from(item.data['data'] ?? {}),
    );

    _eventController.add(
      QueueEvent(
        id: item.id,
        type: QueueEventType.notification,
        data: notification.toJson(),
      ),
    );
  }

  Future<void> _processRegistration(QueueItem item) async {
    // Re-attempt device registration
    _eventController.add(
      QueueEvent(
        id: item.id,
        type: QueueEventType.registration,
        data: item.data,
      ),
    );
  }

  Future<void> _processSync(QueueItem item) async {
    // Process sync events
    _eventController.add(
      QueueEvent(
        id: item.id,
        type: QueueEventType.sync,
        data: item.data,
      ),
    );
  }

  Future<void> _removeItem(String id) async {
    await _database?.delete(
      _tableName,
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> _updateItemError(String id, String error) async {
    await _database?.update(
      _tableName,
      {
        'error': error,
        'last_attempt': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<int> getQueueSize() async {
    final count = Sqflite.firstIntValue(
      await _database?.rawQuery('SELECT COUNT(*) FROM $_tableName'),
    );
    return count ?? 0;
  }

  Future<int> getFailedCount() async {
    final count = Sqflite.firstIntValue(
      await _database?.rawQuery(
          'SELECT COUNT(*) FROM $_tableName WHERE attempts >= $_maxRetries'),
    );
    return count ?? 0;
  }

  Future<void> clear() async {
    await _database?.delete(_tableName);
  }

  Future<void> clearFailed() async {
    await _database?.delete(
      _tableName,
      where: 'attempts >= ?',
      whereArgs: [_maxRetries],
    );
  }

  Future<List<QueueItem>> getAll() async {
    final maps = await _database?.query(_tableName);

    if (maps == null || maps.isEmpty) return [];

    return maps.map((m) => QueueItem.fromMap(m)).toList();
  }

  Future<void> retryFailed() async {
    await _database?.update(
      _tableName,
      {
        'error': null,
        'last_attempt': null,
      },
      where: 'attempts >= ?',
      whereArgs: [_maxRetries],
    );
  }

  Future<void> retryItem(String id) async {
    await _database?.update(
      _tableName,
      {
        'error': null,
        'last_attempt': null,
      },
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  void dispose() {
    _eventController.close();
    _progressController.close();
  }
}
