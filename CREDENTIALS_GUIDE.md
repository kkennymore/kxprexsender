# 🔐 Credentials Setup Guide

This document provides detailed, step-by-step instructions for obtaining all required credentials to use the kxprexsender package.

---

## 📋 Table of Contents

1. [Firebase Cloud Messaging (FCM) Credentials](#1-firebase-cloud-messaging-fcm-credentials)
2. [Web Push (VAPID) Credentials](#2-web-push-vapid-credentials)
3. [Backend Configuration](#3-backend-configuration)
4. [Flutter SDK Configuration](#4-flutter-sdk-configuration)
5. [Environment Variables](#5-environment-variables)
6. [Troubleshooting](#6-troubleshooting)
7. [Security Best Practices](#7-security-best-practices)

---

## 1. Firebase Cloud Messaging (FCM) Credentials

FCM credentials are required for sending push notifications to Android and iOS devices.

### Prerequisites

- A Google Account
- A Firebase project (create one at [console.firebase.google.com](https://console.firebase.google.com))

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"**
3. Enter your project name
4. Follow the setup wizard:
   - Enable/disable Google Analytics (optional)
   - Configure project settings
5. Wait for project creation to complete

### Step 2: Add Your App to Firebase

#### For Android

1. In Firebase Console, select your project
2. Click the **Android icon** to add an Android app
3. Enter your app details:
   - **Android package name**: `com.yourcompany.yourapp` (must match your app)
   - **App nickname**: Your app's display name
   - **Debug signing certificate SHA-1**: (optional, for development)
4. Click **"Register app"**

#### For iOS

1. In Firebase Console, select your project
2. Click the **iOS icon** to add an iOS app
3. Enter your app details:
   - **iOS bundle ID**: `com.yourcompany.yourapp` (must match your app)
   - **App nickname**: Your app's display name
4. Click **"Register app"**

### Step 3: Download Configuration Files

#### Android (`google-services.json`)

1. Go to Project Settings (gear icon ⚙️)
2. Scroll to "Your apps" section
3. Download `google-services.json` for Android

#### iOS (`GoogleService-Info.plist`)

1. Go to Project Settings (gear icon ⚙️)
2. Scroll to "Your apps" section
3. Download `GoogleService-Info.plist` for iOS

### Step 4: Get Service Account Credentials

These credentials are required for the Node.js backend to authenticate with FCM.

1. In Firebase Console, go to **Project Settings**
2. Navigate to **Service Accounts** tab
3. Click **"Generate new private key"**
4. A JSON file will download automatically
5. Keep this file secure - **never commit it to version control**

#### What You'll Get

The downloaded JSON file contains:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk@your-project.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk%40your-project.iam.gserviceaccount.com"
}
```

#### Extract Required Values

For `kxprexsender`, you need:

```typescript
{
  projectId: 'your-project-id',
  clientEmail: 'firebase-adminsdk@your-project.iam.gserviceaccount.com',
  privateKey: '-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----'
}
```

**Important:** Replace `\n` with actual newlines in the private key.

### Step 5: Enable FCM API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project
3. Navigate to **APIs & Services > Library**
4. Search for **"Firebase Cloud Messaging API"**
5. Click **Enable**

---

## 2. Web Push (VAPID) Credentials

VAPID (Voluntary Application Server Identification) is required for sending web push notifications.

### Option A: Using the CLI (Recommended)

```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
npx web-push generate-vapid-keys

# Output:
# ========================================
# Public Key:
# BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
# Private Key:
# rK9BAPD...your-private-key...
# Subject:
# mailto:admin@example.com
# ========================================
```

### Option B: Using the Package

```typescript
import webPush from 'web-push';

const keys = webPush.generateVapidKeys();

console.log('Public Key:', keys.publicKey);
console.log('Private Key:', keys.privateKey);
console.log('Subject:', 'mailto:admin@example.com');
```

### Step 1: Configure VAPID in Firebase Console

1. Go to Firebase Console
2. Select your project
3. Navigate to **Project Settings**
4. Go to **Cloud Messaging** tab
5. Scroll to "Web push certificates"
6. Click **"Generate key pair"**
7. Copy the generated public key

### Step 2: Update Your Configuration

```typescript
{
  webPush: {
    vapidPublicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
    vapidPrivateKey: 'rK9BAPD...your-private-key...',
    subject: 'mailto:admin@example.com' // or your website URL
  }
}
```

### VAPID Subject

The `subject` can be either:
- **mailto**: `mailto:admin@example.com` (recommended)
- **URL**: `https://yourwebsite.com`

This identifies who is sending the notifications.

---

## 3. Backend Configuration

### Complete Configuration Example

Create a `config.ts` file:

```typescript
import { KxPrexSender, CacheService, RateLimiterService, MetricsService } from 'kxprexsender';

// Load from environment variables (recommended)
const config = {
  fcm: {
    projectId: process.env.FCM_PROJECT_ID!,
    clientEmail: process.env.FCM_CLIENT_EMAIL!,
    privateKey: process.env.FCM_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  },
  webPush: {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY!,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    subject: process.env.VAPID_SUBJECT!,
  },
  store: new InMemoryDeviceStore(),
  cache: new CacheService({
    provider: 'redis',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  }),
  rateLimiter: new RateLimiterService({
    windowMs: 60000,
    maxRequests: 100,
  }),
  metrics: new MetricsService(),
};

const sender = new KxPrexSender(config);
```

---

## 4. Flutter SDK Configuration

### Step 1: Add google-services.json (Android)

1. Download `google-services.json` from Firebase Console
2. Place it in `android/app/` directory
3. Update `android/app/build.gradle`:

```gradle
plugins {
  id: "com.android.application"
  id: "kotlin-android"
  id: "dev.flutter.flutterGradlePlugin"
  id: "com.google.gms.google-services" // Add this
}

dependencies {
  implementation platform('com.google.firebase:firebase-bom:32.7.0')
  implementation 'com.google.firebase:firebase-messaging'
}

// At the bottom
apply plugin: 'com.google.gms.google-services'
```

### Step 2: Add GoogleService-Info.plist (iOS)

1. Download `GoogleService-Info.plist` from Firebase Console
2. Place it in `ios/Runner/` directory
3. Add to Xcode:
   - Right-click Runner → Add Files
   - Select `GoogleService-Info.plist`
   - Check "Copy items if needed"

### Step 3: Update Info.plist (iOS)

Add to `ios/Runner/Info.plist`:

```xml
<key>FirebaseAppDelegateProxyEnabled</key>
<true/>
```

### Step 4: Configure in Flutter Code

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await KxPrexSender.initialize(
    KxPrexSenderConfig(
      backendUrl: 'https://api.yourbackend.com',
      appId: 'com.yourcompany.yourapp',
    ),
  );

  runApp(MyApp());
}
```

---

## 5. Environment Variables

Create a `.env` file in your backend root:

```env
# Firebase Cloud Messaging
FCM_PROJECT_ID=your-project-id-12345
FCM_CLIENT_EMAIL=firebase-adminsdk@your-project.12345.iam.gserviceaccount.com

# IMPORTANT: For private key, use $$ for newlines in .env files
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"

# Web Push (VAPID)
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:admin@example.com

# Server Configuration
PORT=3000
BACKEND_URL=http://localhost:3000

# Redis (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# PostgreSQL (Optional)
DATABASE_URL=postgresql://user:password@localhost:5432/kxprexsender
```

### Loading Environment Variables

```typescript
import dotenv from 'dotenv';

dotenv.config();

// Use the variables
const projectId = process.env.FCM_PROJECT_ID;
```

---

## 6. Troubleshooting

### FCM Issues

#### Error: "Project not found"

**Cause:** Incorrect project ID

**Solution:**
1. Verify project ID in Firebase Console
2. Check URL: `https://console.firebase.google.com/project/YOUR_PROJECT_ID`
3. Ensure API is enabled in Google Cloud Console

#### Error: "Service account not found"

**Cause:** Private key or client email is incorrect

**Solution:**
1. Re-download service account key from Firebase Console
2. Extract values carefully
3. Ensure `\n` is replaced with actual newlines

#### Error: "Permission denied"

**Cause:** FCM API not enabled

**Solution:**
1. Go to Google Cloud Console
2. Enable "Firebase Cloud Messaging API"
3. Wait 5-10 minutes for propagation

### Web Push Issues

#### Error: "VAPID key not valid"

**Cause:** Invalid VAPID keys

**Solution:**
1. Regenerate VAPID keys: `npx web-push generate-vapid-keys`
2. Update both public and private keys
3. Update Firebase Console with new public key

#### Error: "Notification not showing in browser"

**Cause:** Multiple possible issues

**Solution:**
1. Check browser console for errors
2. Ensure HTTPS is enabled (required for service workers)
3. Verify notification permissions
4. Check service worker registration

### Common Fixes

```typescript
// Debug FCM authentication
const FCMAuth = new FcmAuthenticator({
  projectId: config.fcm.projectId,
  clientEmail: config.fcm.clientEmail,
  privateKey: config.fcm.privateKey,
});

try {
  const token = await FCMAuth.getAccessToken();
  console.log('FCM Token:', token);
} catch (error) {
  console.error('FCM Auth Error:', error);
}

// Test Web Push
import webPush from 'web-push';

webPush.setVapidDetails(
  config.webPush.subject,
  config.webPush.vapidPublicKey,
  config.webPush.vapidPrivateKey
);

try {
  await webPush.sendNotification(
    subscription,
    JSON.stringify({ title: 'Test', body: 'Hello!' })
  );
} catch (error) {
  console.error('WebPush Error:', error);
}
```

---

## 7. Security Best Practices

### 1. Never Commit Credentials

Add to `.gitignore`:

```gitignore
# Environment files
.env
.env.local
.env.*.local

# Firebase config
google-services.json
GoogleService-Info.plist

# Service account keys
*.json
*.pem
*.key
```

### 2. Use Environment Variables

```typescript
// BAD - Never do this
const sender = new KxPrexSender({
  fcm: {
    projectId: 'my-project-id',
    privateKey: '-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----',
  },
});

// GOOD - Use environment variables
const sender = new KxPrexSender({
  fcm: {
    projectId: process.env.FCM_PROJECT_ID,
    privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});
```

### 3. Rotate Credentials Regularly

1. In Firebase Console:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
2. Update your environment variables
3. Deploy changes
4. Old key will continue working for a few hours

### 4. Use Least Privilege

For production, consider using IAM roles instead of service account keys:

```typescript
// Use Application Default Credentials
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
});

const client = await auth.getClient();
const token = await client.getAccessToken();
```

### 5. Monitor Usage

Enable FCM usage monitoring:

1. Go to Firebase Console → Project Settings
2. Check "Usage and billing"
3. Set up alerts for unusual activity

---

## 📋 Quick Reference

### Required Credentials Summary

| Credential | Where to Find | Used For |
|-----------|---------------|----------|
| `FCM_PROJECT_ID` | Firebase Console → Project Settings | All platforms |
| `FCM_CLIENT_EMAIL` | Firebase Console → Service Accounts | Backend |
| `FCM_PRIVATE_KEY` | Firebase Console → Service Accounts | Backend |
| `VAPID_PUBLIC_KEY` | CLI or Firebase Console → Cloud Messaging | Web Push |
| `VAPID_PRIVATE_KEY` | CLI | Backend |
| `VAPID_SUBJECT` | Your choice (mailto or URL) | Web Push |

### Configuration Checklist

- [ ] Firebase project created
- [ ] Android app added
- [ ] iOS app added
- [ ] Service account downloaded
- [ ] FCM API enabled
- [ ] VAPID keys generated
- [ ] Environment variables set
- [ ] Backend configured
- [ ] Flutter SDK configured
- [ ] Notifications tested

---

## 🔗 Useful Links

- [Firebase Console](https://console.firebase.google.com)
- [Google Cloud Console](https://console.cloud.google.com)
- [FCM Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Documentation](https://developers.google.com/web/fundamentals/push-notifications)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/rfc8292)

---

**Document Version:** 1.0.0  
**Last Updated:** February 2026
