# Backend API Documentation

This document describes the API endpoints that your backend must implement for the kxprexsender Flutter SDK, along with the kxprexsender Node.js package usage.

---

## Table of Contents

1. [Device Registration API](#device-registration-api)
2. [Badge API](#badge-api)
3. [Notification Sending API](#notification-sending-api)
4. [Admin API](#admin-api)
5. [KxPrexSender Node.js Package](#kxprexsender-nodejs-package)
6. [Webhook Endpoints](#webhook-endpoints)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)

---

## Device Registration API

### Register Device

Register a new device for push notifications.

```
POST /kxprexsender/devices/register
```

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {user_token}
X-App-ID: com.yourcompany.app
```

**Request Body:**

```json
{
  "platform": "android" | "ios",
  "transport": "fcm",
  "token": "fcm_push_token_here",
  "appId": "com.yourcompany.app"
}
```

**Web Push Example:**

```json
{
  "platform": "web",
  "transport": "webpush",
  "webPushSubscription": {
    "endpoint": "https://fcm.googleapis.com/...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  },
  "appId": "com.yourcompany.app"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "deviceId": "device_123456789"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `platform_required` | Platform field is missing |
| 400 | `transport_required` | Transport field is missing |
| 400 | `token_required` | Token is required for FCM |
| 400 | `subscription_required` | Subscription is required for WebPush |
| 401 | `unauthorized` | Invalid or missing authorization |

---

### Unregister Device

Remove a device from push notifications.

```
DELETE /kxprexsender/devices/:deviceId
```

**Headers:**

```
Authorization: Bearer {user_token}
```

**Success Response (200):**

```json
{
  "success": true
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | `unauthorized` | Invalid authorization |
| 404 | `device_not_found` | Device not found |

---

### Get User Devices

List all devices registered for a user.

```
GET /kxprexsender/devices
```

**Headers:**

```
Authorization: Bearer {user_token}
```

**Success Response (200):**

```json
{
  "devices": [
    {
      "id": "device_123",
      "platform": "android",
      "transport": "fcm",
      "registeredAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "device_456",
      "platform": "ios",
      "transport": "fcm",
      "registeredAt": "2024-01-14T15:45:00Z"
    }
  ]
}
```

---

## Badge API

### Get Badge Counts

Get the current read/unread badge counts for a user.

```
GET /kxprexsender/badges
```

**Headers:**

```
Authorization: Bearer {user_token}
```

**Success Response (200):**

```json
{
  "unread": 5,
  "read": 15
}
```

**Description:**

| Field | Type | Description |
|-------|------|-------------|
| `unread` | number | Number of unread notifications |
| `read` | number | Number of read notifications |

---

### Update Badge Counts

Update badge counts (usually called when user marks notifications as read).

```
POST /kxprexsender/badges
```

**Headers:**

```
Authorization: Bearer {user_token}
Content-Type: application/json
```

**Request Body:**

```json
{
  "unread": 3,
  "read": 17
}
```

**Success Response (200):**

```json
{
  "success": true
}
```

---

## Notification Sending API

### Send Notification

Send a notification to the authenticated user.

```
POST /kxprexsender/notifications/send
```

**Headers:**

```
Authorization: Bearer {user_token}
Content-Type: application/json
```

**Request Body:**

```json
{
  "title": "New Message",
  "body": "You have a new message from John",
  "type": "chat",
  "data": {
    "chatId": "chat_123",
    "senderId": "user_456"
  },
  "badges": {
    "unread": 6,
    "read": 15
  },
  "effects": {
    "notify": true,
    "badge": true
  },
  "options": {
    "ttl": 86400,
    "collapseKey": "chat_messages"
  }
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | No* | Notification title (required if notify=true) |
| `body` | string | No* | Notification body (required if notify=true) |
| `type` | string | Yes | Notification type (chat, admin, forum, etc.) |
| `data` | object | No | Custom key-value pairs to include |
| `badges` | object | No | Badge counts to send |
| `effects.notify` | boolean | No | Show notification (default: true) |
| `effects.badge` | boolean | No | Update badges (default: true) |
| `options.ttl` | number | No | Time to live in seconds (default: 86400) |
| `options.collapseKey` | string | No | Collapse key for grouping |

**Success Response (200):**

```json
{
  "success": true,
  "delivered": 2,
  "failed": 0,
  "results": [
    {
      "deviceId": "device_123",
      "transport": "fcm",
      "success": true
    },
    {
      "deviceId": "device_456",
      "transport": "fcm",
      "success": true
    }
  ]
}
```

---

## Admin API

### Broadcast to All Users

Send a notification to all registered users.

```
POST /kxprexsender/admin/broadcast
```

**Headers:**

```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Request Body:** Same as [Send Notification](#send-notification)

**Success Response (200):**

```json
{
  "success": true,
  "usersNotified": 150,
  "delivered": 450,
  "failed": 10,
  "results": [
    {
      "userId": "user_123",
      "delivered": 3,
      "failed": 0
    }
  ]
}
```

---

### Get Statistics

Get notification delivery statistics.

```
GET /kxprexsender/admin/stats
```

**Headers:**

```
Authorization: Bearer {admin_token}
```

**Success Response (200):**

```json
{
  "totalDevices": 1000,
  "totalUsers": 500,
  "notificationsSent": 10000,
  "deliveryRate": 98.5,
  "byPlatform": {
    "android": 400,
    "ios": 350,
    "web": 250
  },
  "byTransport": {
    "fcm": 700,
    "webpush": 200,
    "socket": 100
  }
}
```

---

### Cleanup Invalid Devices

Remove devices that are no longer valid.

```
POST /kxprexsender/admin/cleanup
```

**Headers:**

```
Authorization: Bearer {admin_token}
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `olderThan` | string | ISO date (optional) - only remove devices invalid before this date |

**Success Response (200):**

```json
{
  "success": true,
  "removed": 25
}
```

---

## KxPrexSender Node.js Package

### Installation

```bash
npm install kxprexsender
```

### Quick Start

```typescript
import { KxPrexSender, InMemoryDeviceStore } from 'kxprexsender';

const sender = new KxPrexSender({
  fcm: {
    projectId: 'your-project-id',
    clientEmail: 'firebase-adminsdk@your-project.iam.gserviceaccount.com',
    privateKey: 'your-private-key',
  },
  webPush: {
    vapidPublicKey: 'your-vapid-public-key',
    vapidPrivateKey: 'your-vapid-private-key',
    subject: 'mailto:admin@example.com',
  },
  socket: { io: yourSocketIoInstance },
  store: new InMemoryDeviceStore(),
});

// Send notification
const result = await sender.send({
  userId: 'user_123',
  title: 'New Message',
  body: 'You have a new message',
  type: 'chat',
  data: { chatId: 'chat_456' },
  badges: { unread: 5, read: 10 },
});

console.log(`Delivered: ${result.delivered}, Failed: ${result.failed}`);
```

### Effects Control

```typescript
// Normal notification + badge update
await sender.send({
  userId: 'user_123',
  title: 'New Message',
  body: 'Hello!',
  type: 'chat',
  badges: { unread: 5, read: 10 },
  effects: { notify: true, badge: true },
});

// Silent badge update only
await sender.send({
  userId: 'user_123',
  type: 'sync',
  badges: { unread: 4, read: 11 },
  effects: { notify: false, badge: true },
});

// Notification only, no badge change
await sender.send({
  userId: 'user_123',
  title: 'System Update',
  body: 'Update available',
  type: 'admin',
  effects: { notify: true, badge: false },
});
```

---

## Webhook Endpoints

### Delivery Status Webhook

Receive notifications when delivery status changes.

```
POST /webhooks/delivery
```

**Headers:**

```
Content-Type: application/json
X-Webhook-Secret: {webhook_secret}
```

**Request Body:**

```json
{
  "event": "delivery_status",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "notificationId": "notif_123",
    "deviceId": "device_456",
    "userId": "user_789",
    "transport": "fcm",
    "status": "delivered" | "failed",
    "error": "error message if failed"
  }
}
```

---

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `validation_error` | 400 | Invalid request body |
| `unauthorized` | 401 | Invalid or missing authentication |
| `forbidden` | 403 | Insufficient permissions |
| `not_found` | 404 | Resource not found |
| `rate_limited` | 429 | Too many requests |
| `internal_error` | 500 | Server error |
| `service_unavailable` | 503 | Service temporarily unavailable |

---

## Rate Limiting

### Default Limits

| Endpoint | Rate Limit |
|----------|------------|
| `/kxprexsender/devices/register` | 10 requests/minute |
| `/kxprexsender/notifications/send` | 100 requests/minute |
| `/kxprexsender/badges` | 60 requests/minute |
| Admin endpoints | 30 requests/minute |

### Rate Limit Headers

All responses include these headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
```

---

## Security Considerations

### Authentication

- Use JWT tokens for authentication
- Validate tokens on every request
- Implement token refresh mechanism

### Input Validation

- Validate all input parameters
- Sanitize user-provided data
- Limit request body size

### CORS Configuration

Configure CORS for your specific domains:

```typescript
app.use(cors({
  origin: ['https://yourapp.com', 'https://admin.yourapp.com'],
  credentials: true,
}));
```

---

## Monitoring

### Health Check

```
GET /health
```

**Response (200):**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "dependencies": {
    "database": "healthy",
    "cache": "healthy"
  }
}
```

### Metrics Endpoint

```
GET /metrics
```

Returns Prometheus-compatible metrics format.

---

**Document Version:** 1.0.0  
**Last Updated:** February 2026
