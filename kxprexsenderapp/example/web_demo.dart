import 'package:flutter/material.dart';
import 'package:kxprexsender/kxprexsender.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KxPrexSender Demo',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: const DemoPage(),
    );
  }
}

class DemoPage extends StatefulWidget {
  const DemoPage({super.key});

  @override
  State<DemoPage> createState() => _DemoPageState();
}

class _DemoPageState extends State<DemoPage> {
  int _unreadCount = 0;
  int _readCount = 0;
  String _token = '';
  bool _isLoading = false;
  final List<String> _notifications = [];

  @override
  void initState() {
    super.initState();

    KxPrexSender.badges.stream.listen((badges) {
      if (mounted) {
        setState(() {
          _unreadCount = badges.unread;
          _readCount = badges.read;
        });
      }
    });

    KxPrexSender.onMessage((notification) {
      if (mounted) {
        setState(() {
          _notifications.insert(
            0,
            '${notification.title}: ${notification.body}',
          );
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${notification.title}'),
            action: SnackBarAction(
              label: 'View',
              onPressed: () {},
            ),
          ),
        );
      }
    });

    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);

    try {
      final token = await KxPrexSender.getToken();
      final badges = KxPrexSender.badges.current;

      if (mounted) {
        setState(() {
          _token = token ?? 'No token';
          _unreadCount = badges.unread;
          _readCount = badges.read;
        });
      }
    } catch (e) {
      debugPrint('Error loading data: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _refreshBadges() async {
    setState(() => _isLoading = true);

    try {
      await KxPrexSender.refreshBadges();
      final badges = KxPrexSender.badges.current;

      if (mounted) {
        setState(() {
          _unreadCount = badges.unread;
          _readCount = badges.read;
        });
      }
    } catch (e) {
      debugPrint('Error refreshing badges: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _reregister() async {
    setState(() => _isLoading = true);

    try {
      final success = await KxPrexSender.registerDevice();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success
                ? 'Device registered successfully'
                : 'Registration failed'),
          ),
        );
      }
    } catch (e) {
      debugPrint('Error re-registering: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('KxPrexSender Demo'),
        actions: [
          if (_unreadCount > 0)
            Badge(
              label: Text('$_unreadCount'),
              child: const Icon(Icons.notifications),
            ),
          const SizedBox(width: 16),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _refreshBadges,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildBadgeCard(),
                    const SizedBox(height: 16),
                    _buildTokenCard(),
                    const SizedBox(height: 16),
                    _buildActionsCard(),
                    const SizedBox(height: 16),
                    _buildNotificationsCard(),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildBadgeCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.标签,
                  color: Theme.of(context).primaryColor,
                ),
                const SizedBox(width: 8),
                Text(
                  'Badge Counts',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildBadgeItem(
                    icon: Icons.mark_email_unread,
                    label: 'Unread',
                    count: _unreadCount,
                    color: Colors.red,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildBadgeItem(
                    icon: Icons.mark_email_read,
                    label: 'Read',
                    count: _readCount,
                    color: Colors.green,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBadgeItem({
    required IconData icon,
    required String label,
    required int count,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(icon, size: 32, color: color),
          const SizedBox(height: 8),
          Text(
            '$count',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: color,
                  fontWeight: FontWeight.bold,
                ),
          ),
          Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }

  Widget _buildTokenCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.vpn_key,
                  color: Theme.of(context).primaryColor,
                ),
                const SizedBox(width: 8),
                Text(
                  'FCM Token',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: SelectableText(
                _token.length > 100
                    ? '${_token.substring(0, 100)}...'
                    : _token,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontFamily: 'monospace',
                    ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionsCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Actions',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _refreshBadges,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Refresh Badges'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _reregister,
                    icon: const Icon(Icons.device_hub),
                    label: const Text('Re-register'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationsCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.notifications,
                  color: Theme.of(context).primaryColor,
                ),
                const SizedBox(width: 8),
                Text(
                  'Notifications',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_notifications.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('No notifications received yet'),
                ),
              )
            else
              ..._notifications.map(
                (notification) => ListTile(
                  leading: const Icon(Icons.message),
                  title: Text(notification),
                  dense: true,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
