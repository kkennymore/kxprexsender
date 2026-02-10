// Complete example server showing kxprexsender integration
// Run: npx ts-node examples/server.ts

import express, { Request, Response, NextFunction } from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { KxPrexSender, InMemoryDeviceStore } from '../src';
import { KxDevice, KxPrexSenderConfig } from '../src/types';
import webPush from 'web-push';

// Configuration
const CONFIG = {
  fcm: {
    projectId: process.env.FCM_PROJECT_ID || 'your-project-id',
    clientEmail: process.env.FCM_CLIENT_EMAIL || 'firebase-adminsdk@your-project.iam.gserviceaccount.com',
    privateKey: process.env.FCM_PRIVATE_KEY || 'your-private-key',
  },
  webPush: {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || 'your-vapid-public-key',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || 'your-vapid-private-key',
    subject: 'mailto:admin@example.com',
  },
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
};

// Set up web-push
webPush.setVapidDetails(
  CONFIG.webPush.subject,
  CONFIG.webPush.vapidPublicKey,
  CONFIG.webPush.vapidPrivateKey
);

// Create device store
const deviceStore = new InMemoryDeviceStore();

// Create KxPrexSender instance
const sender = new KxPrexSender({
  fcm: CONFIG.fcm,
  webPush: CONFIG.webPush,
  socket: { io: null as any },
  store: deviceStore,
});

// Create Express app
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// Update sender with socket.io instance
const senderWithSocket = new KxPrexSender({
  ...CONFIG,
  socket: { io },
  store: deviceStore,
});

app.use(express.json());

// Middleware for authentication
async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  // In a real app, validate the JWT token here
  // For this example, we extract userId from the token
  const userId = authHeader.replace('Bearer ', '');
  (req as any).userId = userId;
  
  next();
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// VAPID keys endpoint (public)
app.get('/api/vapid-public-key', (req: Request, res: Response) => {
  res.json({ publicKey: CONFIG.webPush.vapidPublicKey });
});

// Device registration endpoint
app.post('/api/devices/register', authenticate, async (req: Request, res: Response) => {
  try {
    const { platform, transport, token, webPushSubscription, appId } = req.body;
    const userId = (req as any).userId;

    if (!platform || !transport) {
      return res.status(400).json({ error: 'platform and transport are required' });
    }

    if (transport === 'fcm' && !token) {
      return res.status(400).json({ error: 'FCM transport requires a token' });
    }

    if (transport === 'webpush' && !webPushSubscription) {
      return res.status(400).json({ error: 'WebPush transport requires subscription' });
    }

    const device: KxDevice = {
      id: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      platform,
      transport,
      token,
      webPushSubscription,
      socketRoom: userId,
    };

    await deviceStore.addDevice(userId, device);

    console.log(`Device registered: ${device.id} for user ${userId}`);

    res.json({ success: true, deviceId: device.id });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Device unregistration endpoint
app.delete('/api/devices/:deviceId', authenticate, async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const userId = (req as any).userId;

    const removed = await deviceStore.removeDevice(userId, deviceId);

    if (removed) {
      console.log(`Device removed: ${deviceId}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Device not found' });
    }
  } catch (error: any) {
    console.error('Unregistration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user devices
app.get('/api/devices', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const devices = await deviceStore.getUserDevices(userId);
    res.json({ devices });
  } catch (error: any) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get badges endpoint
app.get('/api/badges', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const devices = await deviceStore.getUserDevices(userId);

    // In a real app, these would come from your database
    // For this example, we calculate based on device count
    const unread = devices.length * 3; // Mock: 3 unread per device
    const read = devices.length * 10;   // Mock: 10 read total

    res.json({ unread, read });
  } catch (error: any) {
    console.error('Get badges error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send notification endpoint
app.post('/api/notifications/send', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { title, body, type, data, badges, effects, options } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'type is required' });
    }

    const result = await senderWithSocket.send({
      userId,
      title,
      body,
      type,
      data,
      badges,
      effects,
      options,
    });

    console.log(`Notification sent to ${userId}: ${result.delivered} delivered, ${result.failed} failed`);

    res.json({
      success: true,
      delivered: result.delivered,
      failed: result.failed,
      results: result.results,
    });
  } catch (error: any) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Broadcast to all users (admin endpoint)
app.post('/api/admin/broadcast', async (req: Request, res: Response) => {
  try {
    const { title, body, type, data, badges, effects, options } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'type is required' });
    }

    const allDevices = await deviceStore.getAllDevices();
    const users = [...new Set(allDevices.map((d) => d.userId))];

    const results = [];
    let totalDelivered = 0;
    let totalFailed = 0;

    for (const userId of users) {
      const result = await senderWithSocket.send({
        userId,
        title,
        body,
        type,
        data,
        badges,
        effects,
        options,
      });

      totalDelivered += result.delivered;
      totalFailed += result.failed;
      results.push({ userId, ...result });
    }

    console.log(`Broadcast sent: ${totalDelivered} delivered, ${totalFailed} failed to ${users.length} users`);

    res.json({
      success: true,
      usersNotified: users.length,
      delivered: totalDelivered,
      failed: totalFailed,
      results,
    });
  } catch (error: any) {
    console.error('Broadcast error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join', (userId: string) => {
    socket.join(userId);
    console.log(`Socket ${socket.id} joined room: ${userId}`);
  });

  socket.on('leave', (userId: string) => {
    socket.leave(userId);
    console.log(`Socket ${socket.id} left room: ${userId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 KxPrexSender server running on port ${PORT}`);
  console.log(`   Health check: ${CONFIG.backendUrl}/health`);
  console.log(`   VAPID key: ${CONFIG.backendUrl}/api/vapid-public-key`);
});

export { app, server, io };
