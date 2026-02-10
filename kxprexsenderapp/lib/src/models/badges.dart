/// Represents badge counts for notifications.
///
/// This model holds the read and unread notification counts,
/// which are the single source of truth for badge display.
class KxPrexBadges {
  /// Number of unread notifications.
  final int unread;

  /// Number of read notifications.
  final int read;

  /// Creates a new badges instance.
  const KxPrexBadges({
    required this.unread,
    required this.read,
  });

  /// Creates badges with zero counts.
  const KxPrexBadges.zero()
      : unread = 0,
        read = 0;

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is KxPrexBadges &&
        other.unread == unread &&
        other.read == read;
  }

  @override
  int get hashCode => Object.hash(unread, read);

  @override
  String toString() {
    return 'KxPrexBadges(unread: $unread, read: $read)';
  }

  /// Creates a copy with modified values.
  KxPrexBadges copyWith({
    int? unread,
    int? read,
  }) {
    return KxPrexBadges(
      unread: unread ?? this.unread,
      read: read ?? this.read,
    );
  }

  /// Converts to a JSON-serializable map.
  Map<String, int> toJson() {
    return {
      'unread': unread,
      'read': read,
    };
  }

  /// Creates from a JSON map.
  factory KxPrexBadges.fromJson(Map<String, dynamic> json) {
    return KxPrexBadges(
      unread: (json['unread'] as num?)?.toInt() ?? 0,
      read: (json['read'] as num?)?.toInt() ?? 0,
    );
  }
}
