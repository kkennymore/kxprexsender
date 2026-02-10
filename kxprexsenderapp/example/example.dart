import 'package:flutter/material.dart';
import 'package:kxprexsender/kxprexsender.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await KxPrexSender.initialize(
    KxPrexSenderConfig(
      backendUrl: 'https://api.example.com',
      appId: 'com.example.app',
      autoRegister: true,
    ),
  );

  KxPrexSender.onMessage((notification) {
    print('Notification received: ${notification.title}');
    print('Type: ${notification.type}');
    print('Data: ${notification.data}');
  });

  KxPrexSender.setRequestHeadersProvider(() async {
    return {
      'Authorization': 'Bearer your_token_here',
      'X-User-ID': 'user_123',
    };
  });

  runApp(const ExampleApp());
}

class ExampleApp extends StatelessWidget {
  const ExampleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KxPrexSender Example',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _unreadCount = 0;
  int _readCount = 0;
  String _fcmToken = '';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();

    KxPrexSender.badges.stream.listen((badges) {
      setState(() {
        _unreadCount = badges.unread;
        _readCount = badges.read;
      });
    });

    _loadInitialData();
  }

  Future<void> _loadInitialData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final token = await KxPrexSender.getToken();
      final badges = KxPrexSender.badges.current;

      setState(() {
        _fcmToken = token ?? 'No token';
        _unreadCount = badges.unread;
        _readCount = badges.read;
      });
    } catch (e) {
      print('Error loading data: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _refreshBadges() async {
    setState(() {
      _isLoading = true;
    });

    try {
      await KxPrexSender.refreshBadges();
      final badges = KxPrexSender.badges.current;

      setState(() {
        _unreadCount = badges.unread;
        _readCount = badges.read;
      });
    } catch (e) {
      print('Error refreshing badges: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _reregister() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final success = await KxPrexSender.registerDevice();
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Device registered successfully')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Registration failed')),
        );
      }
    } catch (e) {
      print('Error re-registering: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('KxPrexSender Example'),
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
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildBadgeSection(),
                  const SizedBox(height: 24),
                  _buildTokenSection(),
                  const SizedBox(height: 24),
                  _buildActionsSection(),
                  const SizedBox(height: 24),
                  _buildInfoSection(),
                ],
              ),
            ),
    );
  }

  Widget _buildBadgeSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.标签, size: 24),
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

  Widget _buildTokenSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.vpn_key, size: 24),
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
                _fcmToken.length > 50
                    ? '${_fcmToken.substring(0, 50)}...'
                    : _fcmToken,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontFamily: 'monospace',
                    ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Token length: ${_fcmToken.length} characters',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionsSection() {
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

  Widget _buildInfoSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'How It Works',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            _buildInfoItem('1. SDK initializes and requests permissions'),
            _buildInfoItem('2. FCM token is obtained and registered'),
            _buildInfoItem('3. Badge counts are synced from backend'),
            _buildInfoItem('4. Notifications trigger onMessage callback'),
            _buildInfoItem('5. Badge updates arrive in real-time'),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          const Icon(Icons.check_circle, size: 16, color: Colors.green),
          const SizedBox(width: 8),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}
