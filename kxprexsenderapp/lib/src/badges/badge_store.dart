import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/index.dart';

/// Internal store for managing badge state.
///
/// This class maintains the current badge counts and provides
/// a stream for reactive updates.
class BadgeStore {
  static const String _prefsUnreadKey = 'kxprex_badges_unread';
  static const String _prefsReadKey = 'kxprex_badges_read';

  KxPrexBadges _current = const KxPrexBadges.zero();
  final StreamController<KxPrexBadges> _controller = StreamController<KxPrexBadges>.broadcast();

  /// Gets the current badge state.
  KxPrexBadges get current => _current;

  /// Stream of badge updates.
  ///
  /// Subscribe to this to receive real-time badge updates.
  Stream<KxPrexBadges> get stream => _controller.stream;

  /// Initializes the store from local preferences.
  Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final unread = prefs.getInt(_prefsUnreadKey) ?? 0;
      final read = prefs.getInt(_prefsReadKey) ?? 0;
      _current = KxPrexBadges(unread: unread, read: read);
    } catch (e) {
      _current = const KxPrexBadges.zero();
    }
  }

  /// Sets the badge state.
  ///
  /// Updates both the current state and persists to local storage.
  void set(KxPrexBadges badges) {
    _current = badges;
    _controller.add(badges);
    _persist(badges);
  }

  /// Updates only the unread count.
  void setUnread(int unread) {
    set(_current.copyWith(unread: unread));
  }

  /// Updates only the read count.
  void setRead(int read) {
    set(_current.copyWith(read: read));
  }

  /// Resets badges to zero.
  void reset() {
    set(const KxPrexBadges.zero());
  }

  Future<void> _persist(KxPrexBadges badges) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_prefsUnreadKey, badges.unread);
      await prefs.setInt(_prefsReadKey, badges.read);
    } catch (e) {
      // Silently fail persistence errors
    }
  }

  /// Cleans up resources.
  void dispose() {
    _controller.close();
  }
}
