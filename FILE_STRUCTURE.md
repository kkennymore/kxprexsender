# 📁 Complete Project File Structure

This document lists all files in the kxprexsender project.

---

## 📦 Root Directory

```
kxprexsender/
├── README.md                      # Main project documentation
├── CREDENTIALS_GUIDE.md           # Step-by-step credentials setup
├── ENHANCEMENTS.md               # Implementation roadmap
├── PROJECT_SUMMARY.md             # Quick reference
│
├── kxprexsender-node/            # Backend Node.js package
│
└── kxprexsenderapp/              # Flutter SDK package
```

---

## 📦 Backend Package (kxprexsender-node)

```
kxprexsender-node/
├── package.json                   # NPM dependencies & scripts
├── tsconfig.json                  # TypeScript configuration
├── .eslintrc.json                 # ESLint configuration
├── Dockerfile                     # Docker container
├── docker-compose.yml             # Docker Compose services
├── .env.example                   # Environment variables template
├── .gitignore                     # Git ignore rules
│
├── README.md                      # Backend documentation
├── API.md                         # REST API reference
│
├── src/
│   ├── index.ts                  # Package entry point
│   ├── KxPrexSender.ts          # Main sender class
│   ├── types.ts                  # TypeScript type definitions
│   ├── helpers.ts                # Utility functions
│   ├── deviceStore.ts            # In-memory device store
│   ├── mongoDeviceStore.ts       # MongoDB device store
│   ├── postgresDeviceStore.ts    # PostgreSQL device store
│   │
│   ├── core/                     # Core functionality
│   │   ├── router.ts             # Notification routing logic
│   │   └── payloadBuilder.ts     # Payload construction
│   │
│   ├── channels/                 # Transport channels
│   │   ├── webpush.ts            # Web Push transport
│   │   ├── fcm.ts                # FCM HTTP v1 transport
│   │   └── socket.ts             # Socket.io transport
│   │
│   ├── auth/                     # Authentication
│   │   └── fcmAuth.ts            # FCM OAuth JWT authentication
│   │
│   ├── services/                 # NEW: Enhanced services
│   │   ├── index.ts              # Services export
│   │   ├── cache.ts              # Redis/Memory caching
│   │   ├── rateLimiter.ts        # Rate limiting
│   │   ├── metrics.ts             # Prometheus metrics
│   │   ├── healthCheck.ts        # Health checks
│   │   ├── history.ts            # Notification history
│   │   ├── template.ts           # Template system
│   │   ├── batchProcessor.ts     # Batch processing
│   │   └── connectionPool.ts     # Connection pooling
│   │
│   └── utils/                    # Utilities
│       └── logger.ts             # Winston logger
│
└── examples/
    └── server.ts                 # Complete example server
```

---

## 📱 Flutter SDK Package (kxprexsenderapp)

```
kxprexsenderapp/
├── pubspec.yaml                   # Flutter dependencies
├── analysis_options.yaml           # Linting rules
├── README.md                      # Flutter SDK documentation
├── EXAMPLE_USAGE.md                # Detailed examples
├── IMPLEMENTATION_ROADMAP.md      # Development roadmap
├── CHANGELOG.md                   # Version history
├── CONTRIBUTING.md               # Contribution guidelines
├── LICENSE                        # MIT License
│
├── lib/
│   └── kxprexsender.dart         # Main package entry
│
└── lib/src/
    ├── core/                     # Core functionality
    │   ├── index.ts               # Core exports
    │   ├── api.dart              # Backend API service
    │   ├── registrar.dart        # Device registration
    │   ├── bootstrap.dart        # Initialization
    │   ├── analytics.dart         # NEW: Analytics service
    │   └── kxprexsender.dart     # NEW: Main SDK class
    │
    ├── messaging/                 # Notification handling
    │   ├── index.ts               # Messaging exports
    │   ├── fcm_adapter.dart       # FCM adapter
    │   ├── local_notifications.dart  # NEW: Local notifications
    │   └── offline_queue.dart     # NEW: Offline queue
    │
    ├── badges/                    # Badge management
    │   ├── index.ts               # Badge exports
    │   ├── badge_store.dart       # Badge state
    │   └── badge_controller.dart  # Badge API
    │
    └── models/                    # Data models
        ├── index.ts               # Models export
        ├── config.dart           # Configuration
        ├── notification.dart     # Notification model
        └── badges.dart           # Badge model
```

---

## 📝 Documentation Files

| File | Description |
|------|-------------|
| `README.md` | Main project documentation |
| `CREDENTIALS_GUIDE.md` | **NEW** Step-by-step credential setup |
| `ENHANCEMENTS.md` | Implementation enhancements roadmap |
| `PROJECT_SUMMARY.md` | Quick reference summary |

---

## 🎯 Key Files by Feature

### Backend - Main Files

| Feature | File | Lines |
|---------|------|-------|
| Sender | `src/KxPrexSender.ts` | ~150 |
| Router | `src/core/router.ts` | ~200 |
| FCM Auth | `src/auth/fcmAuth.ts` | ~80 |
| FCM Channel | `src/channels/fcm.ts` | ~150 |
| WebPush | `src/channels/webpush.ts` | ~50 |
| Socket | `src/channels/socket.ts` | ~30 |

### Backend - NEW Services

| Feature | File | Lines |
|---------|------|-------|
| Cache | `src/services/cache.ts` | ~250 |
| Rate Limiter | `src/services/rateLimiter.ts` | ~200 |
| Metrics | `src/services/metrics.ts` | ~250 |
| Health Check | `src/services/healthCheck.ts` | ~300 |
| History | `src/services/history.ts` | ~250 |
| Template | `src/services/template.ts` | ~300 |
| Batch | `src/services/batchProcessor.ts` | ~250 |
| Connection Pool | `src/services/connectionPool.ts` | ~300 |

### Flutter - Main Files

| Feature | File | Lines |
|---------|------|-------|
| Main SDK | `lib/src/kxprexsender.dart` | ~250 |
| Bootstrap | `lib/src/core/bootstrap.dart` | ~180 |
| FCM Adapter | `lib/src/messaging/fcm_adapter.dart` | ~200 |
| Badge Store | `lib/src/badges/badge_store.dart` | ~100 |
| Badge Controller | `lib/src/badges/badge_controller.dart` | ~50 |

### Flutter - NEW Files

| Feature | File | Lines |
|---------|------|-------|
| Local Notifications | `lib/src/messaging/local_notifications.dart` | ~400 |
| Offline Queue | `lib/src/messaging/offline_queue.dart` | ~300 |
| Analytics | `lib/src/core/analytics.dart` | ~200 |

---

## 📊 Statistics

### Backend Package

| Metric | Count |
|--------|-------|
| Total Files | 25+ |
| TypeScript Files | 15+ |
| Code Lines | ~3,500 |
| Dependencies | 10+ |
| Services | 8 |

### Flutter Package

| Metric | Count |
|--------|-------|
| Total Files | 20+ |
| Dart Files | 15+ |
| Code Lines | ~2,500 |
| Dependencies | 10+ |

---

## 🔗 Quick Links

### Documentation

- Main: [README.md](README.md)
- Credentials: [CREDENTIALS_GUIDE.md](CREDENTIALS_GUIDE.md)
- API: [kxprexsender-node/API.md](kxprexsender-node/API.md)
- Examples: [kxprexsenderapp/EXAMPLE_USAGE.md](kxprexsenderapp/EXAMPLE_USAGE.md)

### Getting Started

1. **Backend Setup**
   ```
   cd kxprexsender-node
   npm install
   cp .env.example .env
   # Edit .env with credentials (see CREDENTIALS_GUIDE.md)
   npm run dev
   ```

2. **Flutter Setup**
   ```
   # Add to pubspec.yaml
   kxprexsender: ^2.0.0
   
   # Configure Firebase (see CREDENTIALS_GUIDE.md)
   flutter pub get
   ```

---

## 🏷️ Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Feb 2026 | Initial MVP release |
| 2.0.0 | Feb 2026 | Added caching, metrics, templates, analytics, offline queue |

---

**Last Updated:** February 2026
