# Contributing to KxPrexSender

Thank you for your interest in contributing to KxPrexSender! This document provides guidelines and instructions for contributing.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Submitting Changes](#submitting-changes)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/0/code_of_conduct.html). By participating, you are expected to uphold this code.

---

## Getting Started

### Prerequisites

- Flutter SDK 3.10.0+
- Dart SDK 3.0.0+
- Git

### Setting Up Development Environment

1. Fork the repository on GitHub

2. Clone your fork locally:

```bash
git clone https://github.com/YOUR-USERNAME/kxprexsender.git
cd kxprexsender
```

3. Add the upstream remote:

```bash
git remote add upstream https://github.com/ORIGINAL-ORG/kxprexsender.git
```

4. Install dependencies:

```bash
flutter pub get
```

---

## Development Process

### Creating a Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create new branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. Make your changes following the coding standards
2. Add or update tests
3. Update documentation as needed
4. Ensure all tests pass

### Committing Changes

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "Add feature: brief description of changes"

# Push to your fork
git push origin feature/your-feature-name
```

---

## Coding Standards

### Style Guide

Follow the [Effective Dart](https://dart.dev/guides/language/effective-dart) guide and these additional rules:

#### 1. Naming Conventions

- **Classes:** PascalCase (`KxPrexSender`, `BadgeStore`)
- **Variables & Functions:** camelCase (`notification`, `getToken`)
- **Constants:** camelCase with `k` prefix (`kDefaultTimeout`)
- **Private members:** Leading underscore (`_internalState`)

```dart
// Good
class KxPrexNotification {
  final String title;
  final int _internalId;

  void getToken() { }
}

// Bad
class kxprex_notification {
  final String Title;
  void GETTOKEN() { }
}
```

#### 2. Documentation

Document all public APIs:

```dart
/// Initializes the SDK with the provided configuration.
///
/// This method must be called before any other SDK methods.
///
/// [config] Configuration options for the SDK.
///
/// Throws [StateError] if already initialized.
///
/// ## Example
/// ```dart
/// await KxPrexSender.initialize(
///   KxPrexSenderConfig(
///     backendUrl: 'https://api.example.com',
///     appId: 'com.example.app',
///   ),
/// );
/// ```
Future<void> initialize(KxPrexSenderConfig config) async {
  // Implementation
}
```

#### 3. Error Handling

Use specific exception types:

```dart
/// Thrown when SDK is not initialized
class NotInitializedException implements Exception {
  final String message = 'KxPrexSender not initialized. Call initialize() first.';
}

/// Thrown when device registration fails
class RegistrationException implements Exception {
  final String message;
  RegistrationException(this.message);
}
```

#### 4. Immutability

Use immutable patterns:

```dart
class KxPrexNotification {
  final String title;
  final String body;
  final Map<String, dynamic> data;

  const KxPrexNotification({
    required this.title,
    required this.body,
    required this.data,
  });

  /// Creates a copy with modified values
  KxPrexNotification copyWith({
    String? title,
    String? body,
    Map<String, dynamic>? data,
  }) {
    return KxPrexNotification(
      title: title ?? this.title,
      body: body ?? this.body,
      data: data ?? this.data,
    );
  }
}
```

#### 5. Async/Await

Handle errors in async methods:

```dart
Future<KxPrexBadges> fetchBadges() async {
  try {
    final response = await http.get(uri);
    return KxPrexBadges.fromJson(jsonDecode(response.body));
  } catch (e) {
    // Log error but don't crash
    return const KxPrexBadges.zero();
  }
}
```

---

## Testing

### Running Tests

```bash
# Run all tests
flutter test

# Run with coverage
flutter test --coverage

# Run specific test file
flutter test test/badge_store_test.dart
```

### Writing Tests

```dart
import 'package:test/test.dart';
import 'package:kxprexsender/kxprexsender.dart';

void main() {
  group('BadgeStore', () {
    late BadgeStore store;

    setUp(() {
      store = BadgeStore();
    });

    test('should initialize with zero badges', () {
      expect(store.current.unread, 0);
      expect(store.current.read, 0);
    });

    test('should update badges', () {
      store.set(const KxPrexBadges(unread: 5, read: 10));

      expect(store.current.unread, 5);
      expect(store.current.read, 10);
    });
  });
}
```

### Test Coverage Requirements

- All public APIs must be tested
- Edge cases should be covered
- Error handling paths must be tested

---

## Documentation

### README Updates

Update the README when:
- Adding new features
- Changing API signatures
- Updating examples
- Adding troubleshooting steps

### Doc Comments

All public classes, methods, and properties must have documentation:

```dart
/// Controller for accessing and managing badge state.
///
/// Provides a clean public API for badge operations while
/// encapsulating the internal store implementation.
class KxPrexBadgeController {
  /// Gets the current unread count.
  int get unread;

  /// Stream of badge updates.
  ///
  /// Subscribe to this stream to receive real-time badge changes.
  /// The stream emits [KxPrexBadges] whenever badges are updated.
  Stream<KxPrexBadges> get stream;
}
```

---

## Submitting Changes

### Pull Request Process

1. Ensure all tests pass
2. Update documentation
3. Add entry to CHANGELOG
4. Create pull request with:
   - Clear title
   - Detailed description
   - Link to related issues
   - Screenshots (if UI changes)

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe how changes were tested

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] All tests pass
```

---

## Release Process

### Version Bumping

Follow Semantic Versioning:
- **Major:** Breaking changes
- **Minor:** New features (backward compatible)
- **Patch:** Bug fixes

### Release Checklist

- [ ] Update version in pubspec.yaml
- [ ] Update CHANGELOG
- [ ] Create release tag
- [ ] Publish to pub.dev
- [ ] Create GitHub release

---

## Getting Help

- **GitHub Issues:** For bug reports and feature requests
- **Discussions:** For questions and community support
- **Documentation:** See README.md and docs/

---

Thank you for contributing to KxPrexSender!
