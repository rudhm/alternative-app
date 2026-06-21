import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cookieParser from 'cookie-parser';
import path from 'path';
import { authMiddleware, verifyWsToken, generateToken } from './auth';
import { uploadMiddleware, processMedia, uploadDir } from './upload';
import { prisma } from './prisma';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

const app = express();
app.set('trust proxy', 1);
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ['http://localhost:3000'];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', authMiddleware, express.static(uploadDir));

// Ensure seed users exist
async function initDb() {
  await prisma.user.upsert({ where: { id: 'Hasi' }, update: {}, create: { id: 'Hasi' } });
  await prisma.user.upsert({ where: { id: 'Rudh' }, update: {}, create: { id: 'Rudh' } });
}
initDb().catch(console.error);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts. Please try again later.' }
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  console.log("LOGIN HIT LOCAL", req.body);
  const { userId } = req.body;
  if (userId !== 'Hasi' && userId !== 'Rudh') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  const token = generateToken(userId);
  res.cookie('token', token, {
    httpOnly: true,
    secure: true, // required for SameSite=none
    sameSite: 'none', // required for cross-origin cookie sharing
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  });
  res.json({ success: true, userId, token });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const userId = (req as any).userId;
  const token = generateToken(userId);
  res.json({ success: true, userId, token });
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many uploads' }
});

app.post('/api/upload', authMiddleware, uploadLimiter, uploadMiddleware.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  try {
    const { url, type } = await processMedia(req.file);
    res.json({ url, type });
  } catch (err) {
    res.status(500).json({ error: 'Media processing failed' });
  }
});

// Cursor-based pagination endpoint for fetching history
app.get('/api/messages', authMiddleware, async (req, res) => {
  const cursor = req.query.cursor as string | undefined;
  const limit = 50;

  const messages = await prisma.message.findMany({
    take: limit + 1,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { media: true, reactions: true, readReceipt: true, replyTo: true },
  });

  let nextCursor: string | undefined = undefined;
  if (messages.length > limit) {
    const nextItem = messages.pop();
    nextCursor = nextItem?.id;
  }

  res.json({ messages: messages.reverse(), nextCursor });
});

// --- WebSocket Setup ---

const clients = new Map<string, WebSocket>();

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((client: any) => {
    if (client.isAlive === false) {
      const userId = client.userId;
      if (userId && clients.get(userId) === client) {
        clients.delete(userId);
        const now = new Date();
        prisma.user.update({ where: { id: userId }, data: { lastSeen: now } }).catch(() => {});
        broadcast({ type: 'presence', userId, status: 'offline', lastSeen: now.toISOString() });
      }
      return client.terminate();
    }
    client.isAlive = false;
    client.ping();
  });
}, 30000);

interface RateLimitInfo {
  tokens: number;
  lastRefill: number;
}
const wsRateLimits = new Map<string, RateLimitInfo>();
const MAX_TOKENS = 20;
const REFILL_RATE = 10;

function consumeToken(userId: string): boolean {
  const now = Date.now();
  let info = wsRateLimits.get(userId);
  if (!info) {
    info = { tokens: MAX_TOKENS, lastRefill: now };
    wsRateLimits.set(userId, info);
  }
  const timePassed = (now - info.lastRefill) / 1000;
  info.tokens = Math.min(MAX_TOKENS, info.tokens + timePassed * REFILL_RATE);
  info.lastRefill = now;
  if (info.tokens >= 1) {
    info.tokens -= 1;
    return true;
  }
  return false;
}

const wsMessageSchema = z.object({
  type: z.string(),
  payload: z.any().optional()
});

const chatPayloadSchema = z.object({
  id: z.string(),
  content: z.string().optional().nullable(),
  replyToId: z.string().optional().nullable(),
  media: z.array(z.object({
    url: z.string(),
    type: z.string()
  })).optional().nullable()
});

const reactionPayloadSchema = z.object({
  messageId: z.string(),
  emoji: z.string()
});

const readPayloadSchema = z.object({
  messageId: z.string()
});

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  const tokenFromUrl = url.searchParams.get('token');
  const cookies = request.headers.cookie;
  const tokenMatch = cookies?.match(/token=([^;]+)/);
  const token = tokenFromUrl || (tokenMatch ? tokenMatch[1] : null);

  if (!token) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  const payload = verifyWsToken(token);
  if (!payload) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    (ws as any).userId = payload.userId;
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws: any) => {
  const userId = ws.userId;
  clients.set(userId, ws);

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  // Broadcast presence
  broadcast({ type: 'presence', userId, status: 'online' });

  // Send current status of the other user to the newly connected user
  const otherUserId = userId === 'Hasi' ? 'Rudh' : 'Hasi';
  const isOtherOnline = clients.has(otherUserId);
  if (isOtherOnline) {
    ws.send(JSON.stringify({ type: 'presence', userId: otherUserId, status: 'online' }));
  } else {
    prisma.user.findUnique({ where: { id: otherUserId } }).then(otherUser => {
      if (otherUser) {
        ws.send(JSON.stringify({ type: 'presence', userId: otherUserId, status: 'offline', lastSeen: otherUser.lastSeen }));
      }
    });
  }

  ws.on('message', async (messageData: any) => {
    if (!consumeToken(userId)) {
      ws.send(JSON.stringify({ type: 'error', message: 'Rate limit exceeded' }));
      return;
    }

    try {
      const parsed = JSON.parse(messageData.toString());
      const data = wsMessageSchema.parse(parsed);
      
      if (data.type === 'chat') {
        const payload = chatPayloadSchema.parse(data.payload);
        const { id, content, media, replyToId } = payload;
        const dbMsg = await prisma.message.create({
          data: {
            id,
            content: content || null,
            authorId: userId,
            replyToId: replyToId || null,
            media: media && media.length > 0 ? {
              create: media.map((m: any) => ({
                url: m.url,
                type: m.type
              }))
            } : undefined
          },
          include: { media: true, reactions: true, readReceipt: true, replyTo: true }
        });
        broadcast({ type: 'chat', payload: dbMsg });
      } else if (data.type === 'typing') {
        broadcast({ type: 'typing', userId }, [userId]);
      } else if (data.type === 'reaction') {
        const payload = reactionPayloadSchema.parse(data.payload);
        const { messageId, emoji } = payload;
        const existing = await prisma.reaction.findUnique({
          where: { userId_messageId_emoji: { userId, messageId, emoji } }
        });
        if (existing) {
          await prisma.reaction.delete({ where: { id: existing.id } });
          broadcast({ type: 'reaction_removed', payload: { messageId, userId, emoji } });
        } else {
          const r = await prisma.reaction.create({ data: { userId, messageId, emoji } });
          broadcast({ type: 'reaction_added', payload: r });
        }
      } else if (data.type === 'read') {
        const payload = readPayloadSchema.parse(data.payload);
        const { messageId } = payload;
        const rr = await prisma.readReceipt.upsert({
          where: { messageId },
          update: {},
          create: { messageId, userId }
        });
        broadcast({ type: 'read_receipt', payload: rr });
      }
    } catch (err) {
      console.error('WS message error or validation failed', err);
    }
  });

  ws.on('close', async () => {
    if (clients.get(userId) === ws) {
      clients.delete(userId);
      const now = new Date();
      try {
        await prisma.user.update({ where: { id: userId }, data: { lastSeen: now } });
      } catch (e) { console.error('Failed to update lastSeen', e); }
      broadcast({ type: 'presence', userId, status: 'offline', lastSeen: now.toISOString() });
    }
  });
});

function broadcast(data: any, excludeUserIds: string[] = []) {
  const payload = JSON.stringify(data);
  for (const [uid, client] of clients.entries()) {
    if (!excludeUserIds.includes(uid) && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

function gracefulShutdown() {
  console.log("Shutting down gracefully...");
  clearInterval(heartbeatInterval);
  wss.clients.forEach(ws => ws.close());
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
// Trigger deploy 2
