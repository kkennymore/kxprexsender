# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-02-10

### Added

- Initial release of kxprexsender Flutter SDK
- Complete notification handling system
- Badge count management (read/unread)
- Real-time badge synchronization
- Effect control (notify vs badge-only updates)
- Device registration with backend
- Custom authentication header support
- Token refresh handling
- Background message processing
- Platform-specific optimization (Android & iOS)
- Comprehensive documentation
- Example application

### Features

#### Core Features
- `KxPrexSender.initialize()` - Single-call SDK initialization
- `KxPrexSender.onMessage()` - Notification callback
- `KxPrexSender.badges` - Badge management controller
- `KxPrexSender.setRequestHeadersProvider()` - Auth header injection
- `KxPrexSender.refreshBadges()` - Manual badge sync
- `KxPrexSender.registerDevice()` - Manual device registration

#### Badge System
- Reactive badge stream
- Persistent badge storage
- Backend badge synchronization
- Badge-only updates (silent mode)

#### Notification Handling
- Foreground message processing
- Background message handling
- Type-specific notification routing
- Custom data extraction
- Effects control (notify/badge flags)

#### Backend Integration
- Device registration endpoint
- Badge sync endpoint
- Custom header support
- Retry logic for registration
- Token caching

### Dependencies

- `firebase_messaging: ^14.7.0`
- `http: ^1.2.0`
- `shared_preferences: ^2.2.2`

### Supported Platforms

- Android (API 21+)
- iOS (15.0+)

---

## [Unreleased]

### Planned Features

- Socket.io real-time support
- Notification categories with actions
- Analytics integration
- Deep link handling
- Notification scheduling
- Local notification display
- Web platform support

---

## Upgrade Guide

### From 0.x to 1.0.0

The 1.0.0 release is the first stable version of kxprexsender. No migration is needed as this is a new package.

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

---

## Support

For issues and questions:
- Open a [GitHub Issue](https://github.com/your-org/kxprexsender/issues)
- Review the [Documentation](README.md)
- Check the [FAQ](README.md#faq)
