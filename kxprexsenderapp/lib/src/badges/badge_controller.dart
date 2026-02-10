import 'dart:async';
import '../models/index.dart';
import 'badge_store.dart';

/// Controller for accessing and managing badge state.
///
/// Provides a clean public API for badge operations while
/// encapsulating the internal store implementation.
class KxPrexBadgeController {
  final BadgeStore _store;

  /// Creates a new controller with the given store.
  KxPrexBadgeController(this._store);

  /// Gets the current unread count.
  int get unread => _store.current.unread;

  /// Gets the current read count.
  int get read => _store.current.read;

  /// Stream of badge updates.
  ///
  /// Subscribe to this stream to receive real-time badge changes.
  /// The stream emits [KxPrexBadges] whenever badges are updated.
  ///
  /// Example:
  /// ```dart
  /// KxPrexSender.badges.stream.listen((badges) {
  ///   print('Unread: ${badges.unread}');
  /// });
  /// ```
  Stream<KxPrexBadges> get stream => _store.stream;

  /// Gets the current badge state.
  KxPrexBadges get current => _store.current;

  /// Updates the badge state.
  ///
  /// [badges] The new badge counts to set.
  void update(KxPrexBadges badges) {
    _store.set(badges);
  }

  /// Resets all badges to zero.
  void reset() {
    _store.reset();
  }

  /// Returns true if there are unread notifications.
  bool get hasUnread => unread > 0;

  /// Returns the total count (read + unread).
  int get total => unread + read;
}
