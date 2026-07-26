import { Server as SocketIOServer, Socket } from 'socket.io';
import { ChatRoom, ChatMessage, ChatImage, Report } from '../db/mongodb.js';

export interface ChatReport {
  id: string;
  roomId: string;
  reporterName: string;
  reportedName: string;
  reason: string;
  timestamp: string;
}

const PERSONAS = [
  'Happy Panda 🐼',
  'Spark User #1842',
  'Blue Star ⭐️',
  'Coding Hero 💻',
  'Dream Walker 🌌',
  'Sunshine Bloom 🌻',
  'Cosmic Spark ✨',
  'Kind Heart 💖',
  'Joy Explorer 🚀',
  'Golden Ray ☀️',
  'Serene Spirit 🌊',
  'Zen Master 🧘',
  'Bright Mind 🧠',
  'Glow Finder 🌟',
  'Peaceful Pine 🌲',
  'Velvet Wave 🌊',
  'Lucky Clover 🍀',
  'Brave Eagle 🦅',
  'Hope Bringer 🌈',
  'Smile Ambassador 😊',
];

const ICEBREAKERS = [
  'What made you smile today? 😊',
  "What's your biggest dream? 🌟",
  'Share one positive thing that happened this week! ✨',
  "What's your favourite motivational quote? 📖",
  "What's one goal you're currently working toward? 🚀",
  'If you could travel anywhere right now, where would you go? ✈️',
];

// In-Memory Presence & Realtime Socket State (Firebase/Socket.IO)
const onlineSockets = new Map<string, { socket: Socket; sessionId: string; identity: string; joinedAt: number }>();
const waitingQueue: { socketId: string; sessionId: string; identity: string; joinedAt: number }[] = [];
const activeRooms = new Map<
  string,
  {
    id: string;
    user1: { socketId: string; sessionId: string; identity: string };
    user2: { socketId: string; sessionId: string; identity: string };
    createdAt: number;
    messagesCount: number;
    imagesCount: number;
  }
>();
const socketToRoom = new Map<string, string>();
const blockedPairs = new Set<string>();
let globalIoInstance: SocketIOServer | null = null;

// Helper to get random persona identity
function getIdentity(): string {
  const index = Math.floor(Math.random() * PERSONAS.length);
  const randomNumber = Math.floor(Math.random() * 8999) + 1000;
  return PERSONAS[index].includes('#') ? PERSONAS[index] : `${PERSONAS[index]} #${randomNumber}`;
}

export function setupSocketIO(io: SocketIOServer) {
  globalIoInstance = io;
  io.on('connection', (socket: Socket) => {
    let userSessionId = `spark_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let userAlias = getIdentity();

    // Register User Presence & Session ID
    socket.on('register_session', (data: { sessionId?: string; alias?: string }) => {
      if (data?.sessionId) userSessionId = data.sessionId;
      if (data?.alias) userAlias = data.alias;

      onlineSockets.set(socket.id, {
        socket,
        sessionId: userSessionId,
        identity: userAlias,
        joinedAt: Date.now(),
      });

      broadcastStats(io);
    });

    // Default registration if not explicitly called
    if (!onlineSockets.has(socket.id)) {
      onlineSockets.set(socket.id, {
        socket,
        sessionId: userSessionId,
        identity: userAlias,
        joinedAt: Date.now(),
      });
    }

    // Get current stats on client connect
    socket.on('get_online_stats', async () => {
      const stats = await getChatStats();
      socket.emit('online_stats_response', stats);
    });

    // Start Matching
    socket.on('start_matching', async (data?: { sessionId?: string; alias?: string }) => {
      if (data?.sessionId) userSessionId = data.sessionId;
      if (data?.alias) userAlias = data.alias;

      // Update online map
      onlineSockets.set(socket.id, {
        socket,
        sessionId: userSessionId,
        identity: userAlias,
        joinedAt: Date.now(),
      });

      // Check if user is already waiting or in a room
      if (socketToRoom.has(socket.id)) {
        return;
      }

      const existingIndex = waitingQueue.findIndex((item) => item.socketId === socket.id);
      if (existingIndex !== -1) {
        socket.emit('waiting_in_queue', { position: existingIndex + 1, estimatedWaitSec: 5 });
        return;
      }

      // Clean stale sockets from waiting queue first
      for (let i = waitingQueue.length - 1; i >= 0; i--) {
        const item = waitingQueue[i];
        if (!onlineSockets.has(item.socketId)) {
          waitingQueue.splice(i, 1);
        }
      }

      // Try to find a valid online match in the waiting queue
      let matchedPartner: { socketId: string; sessionId: string; identity: string } | null = null;

      while (waitingQueue.length > 0) {
        const matchIndex = waitingQueue.findIndex((item) => {
          if (item.socketId === socket.id) return false;
          if (item.sessionId === userSessionId) return false; // Prevent matching with self across multiple tabs
          const pair1 = `${userSessionId}:${item.sessionId}`;
          const pair2 = `${item.sessionId}:${userSessionId}`;
          return !blockedPairs.has(pair1) && !blockedPairs.has(pair2);
        });

        if (matchIndex === -1) break;

        const candidate = waitingQueue.splice(matchIndex, 1)[0];
        const candidateSocketInfo = onlineSockets.get(candidate.socketId);

        if (candidateSocketInfo && candidateSocketInfo.socket.connected) {
          matchedPartner = candidate;
          break;
        }
      }

      if (matchedPartner) {
        // Found valid online partner!
        const partner = matchedPartner;
        const partnerSocketInfo = onlineSockets.get(partner.socketId)!;
        const partnerSocket = partnerSocketInfo.socket;
        const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

        socket.join(roomId);
        partnerSocket.join(roomId);

        activeRooms.set(roomId, {
          id: roomId,
          user1: { socketId: socket.id, sessionId: userSessionId, identity: userAlias },
          user2: { socketId: partner.socketId, sessionId: partner.sessionId, identity: partner.identity },
          createdAt: Date.now(),
          messagesCount: 0,
          imagesCount: 0,
        });

        socketToRoom.set(socket.id, roomId);
        socketToRoom.set(partner.socketId, roomId);

        // Store ChatRoom in MongoDB permanently
        ChatRoom.create({
          roomId,
          user1SessionId: userSessionId,
          user2SessionId: partner.sessionId,
          user1Alias: userAlias,
          user2Alias: partner.identity,
          createdAt: new Date().toISOString(),
          status: 'active',
          totalMessages: 0,
          totalImages: 0,
        }).catch((err) => console.error('MongoDB ChatRoom create error:', err));

        // Notify both clients
        socket.emit('match_found', {
          roomId,
          myIdentity: userAlias,
          mySessionId: userSessionId,
          partnerName: partner.identity,
          partnerSessionId: partner.sessionId,
          icebreakers: ICEBREAKERS,
          startTime: Date.now(),
        });

        partnerSocket.emit('match_found', {
          roomId,
          myIdentity: partner.identity,
          mySessionId: partner.sessionId,
          partnerName: userAlias,
          partnerSessionId: userSessionId,
          icebreakers: ICEBREAKERS,
          startTime: Date.now(),
        });

        broadcastStats(io);
      } else {
        // No partner available yet, add to queue
        waitingQueue.push({
          socketId: socket.id,
          sessionId: userSessionId,
          identity: userAlias,
          joinedAt: Date.now(),
        });
        socket.emit('waiting_in_queue', {
          position: waitingQueue.length,
          estimatedWaitSec: Math.max(3, waitingQueue.length * 4),
        });
        broadcastStats(io);
      }
    });

    // Cancel Matching
    socket.on('cancel_matching', () => {
      const idx = waitingQueue.findIndex((item) => item.socketId === socket.id);
      if (idx !== -1) {
        waitingQueue.splice(idx, 1);
      }
      socket.emit('matching_cancelled');
      broadcastStats(io);
    });

    // Send Message
    socket.on('send_message', async (data: { roomId: string; text?: string; image?: string; senderSessionId?: string; senderAlias?: string }) => {
      const { roomId, text, image } = data;
      const room = activeRooms.get(roomId);

      if (!room) return;

      room.messagesCount++;
      if (image) {
        room.imagesCount++;
      }

      // Basic profanity / spam filtering
      let processedText = text || '';
      const badWords = ['hate', 'abuse', 'vulgar', 'spam', 'scam'];
      badWords.forEach((word) => {
        const regex = new RegExp(word, 'gi');
        processedText = processedText.replace(regex, '***');
      });

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const messageObj = {
        id: messageId,
        roomId,
        senderSocketId: socket.id,
        senderSessionId: data.senderSessionId || userSessionId,
        senderName: data.senderAlias || userAlias,
        text: processedText,
        image,
        timestamp: new Date().toISOString(),
        status: 'delivered',
      };

      // Deliver via Socket.IO
      io.to(roomId).emit('receive_message', messageObj);

      // Save Message to MongoDB
      ChatMessage.create({
        id: messageId,
        roomId,
        senderSessionId: data.senderSessionId || userSessionId,
        senderAlias: data.senderAlias || userAlias,
        messageType: image ? 'image' : 'text',
        message: processedText,
        imageUrl: image || '',
        createdAt: new Date().toISOString(),
      }).catch((err) => console.error('MongoDB ChatMessage create error:', err));

      if (image) {
        ChatImage.create({
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          roomId,
          senderSessionId: data.senderSessionId || userSessionId,
          senderAlias: data.senderAlias || userAlias,
          imageUrl: image,
          uploadedAt: new Date().toISOString(),
        }).catch((err) => console.error('MongoDB ChatImage create error:', err));
      }

      // Update room counts in MongoDB
      ChatRoom.updateOne(
        { roomId },
        { $inc: { totalMessages: 1, totalImages: image ? 1 : 0 } }
      ).catch((err) => console.error('MongoDB update ChatRoom error:', err));
    });

    // Typing Status
    socket.on('typing_status', (data: { roomId: string; isTyping: boolean }) => {
      socket.to(data.roomId).emit('partner_typing', { isTyping: data.isTyping, name: userAlias });
    });

    // Read Receipts
    socket.on('mark_read', (data: { roomId: string }) => {
      socket.to(data.roomId).emit('partner_read');
    });

    // Leave Chat
    socket.on('leave_chat', (data: { roomId: string }) => {
      handleRoomEnd(io, data.roomId, socket.id, 'Your partner has ended the conversation.');
    });

    // Report User
    socket.on('report_user', (data: { roomId: string; reason: string; description?: string }) => {
      const room = activeRooms.get(data.roomId);
      if (room) {
        const isUser1 = room.user1.socketId === socket.id;
        const reporterSessionId = isUser1 ? room.user1.sessionId : room.user2.sessionId;
        const reportedSessionId = isUser1 ? room.user2.sessionId : room.user1.sessionId;
        const reporterAlias = isUser1 ? room.user1.identity : room.user2.identity;
        const reportedAlias = isUser1 ? room.user2.identity : room.user1.identity;

        // Save Report to MongoDB
        Report.create({
          id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          roomId: data.roomId,
          reporterSessionId,
          reportedSessionId,
          reporterAlias,
          reportedAlias,
          reason: data.reason || 'Inappropriate behavior',
          description: data.description || data.reason || 'Reported by user in chat',
          createdAt: new Date().toISOString(),
          status: 'pending',
        }).catch((err) => console.error('MongoDB Report create error:', err));

        handleRoomEnd(io, data.roomId, socket.id, 'Conversation ended following a report submission.');
      }
    });

    // Block User
    socket.on('block_user', (data: { roomId: string }) => {
      const room = activeRooms.get(data.roomId);
      if (room) {
        const partnerSessionId = room.user1.socketId === socket.id ? room.user2.sessionId : room.user1.sessionId;
        blockedPairs.add(`${userSessionId}:${partnerSessionId}`);
        blockedPairs.add(`${partnerSessionId}:${userSessionId}`);

        handleRoomEnd(io, data.roomId, socket.id, 'User blocked. You will not be matched again.');
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      onlineSockets.delete(socket.id);

      // Remove from waiting queue if present
      const qIdx = waitingQueue.findIndex((item) => item.socketId === socket.id);
      if (qIdx !== -1) {
        waitingQueue.splice(qIdx, 1);
      }

      // If in active room, end room
      const roomId = socketToRoom.get(socket.id);
      if (roomId) {
        handleRoomEnd(io, roomId, socket.id, 'Your partner has disconnected.');
      }

      broadcastStats(io);
    });
  });
}

function handleRoomEnd(io: SocketIOServer, roomId: string, triggerSocketId: string, message: string) {
  const room = activeRooms.get(roomId);
  if (!room) return;

  const durationSec = Math.round((Date.now() - room.createdAt) / 1000);

  // Update room in MongoDB
  ChatRoom.updateOne(
    { roomId },
    {
      $set: {
        status: 'ended',
        endedAt: new Date().toISOString(),
        duration: durationSec,
      },
    }
  ).catch((err) => console.error('MongoDB ChatRoom end update error:', err));

  // Notify partner
  const partnerSocketId = room.user1.socketId === triggerSocketId ? room.user2.socketId : room.user1.socketId;
  const partnerSocketInfo = onlineSockets.get(partnerSocketId);

  if (partnerSocketInfo) {
    partnerSocketInfo.socket.emit('partner_left', { message });
    partnerSocketInfo.socket.leave(roomId);
  }

  const triggerSocketInfo = onlineSockets.get(triggerSocketId);
  if (triggerSocketInfo) {
    triggerSocketInfo.socket.leave(roomId);
  }

  socketToRoom.delete(room.user1.socketId);
  socketToRoom.delete(room.user2.socketId);
  activeRooms.delete(roomId);

  broadcastStats(io);
}

async function broadcastStats(io: SocketIOServer) {
  const stats = await getChatStats();
  io.emit('online_stats_update', stats);
}

export function getLiveOnlineUsers() {
  const users: { socketId: string; sessionId: string; identity: string; joinedAt: number }[] = [];
  onlineSockets.forEach((val, key) => {
    users.push({
      socketId: key,
      sessionId: val.sessionId,
      identity: val.identity,
      joinedAt: val.joinedAt,
    });
  });
  return users;
}

export function getLiveActiveRooms() {
  const rooms: any[] = [];
  activeRooms.forEach((val) => {
    rooms.push({
      id: val.id,
      user1: val.user1,
      user2: val.user2,
      createdAt: val.createdAt,
      messagesCount: val.messagesCount,
      imagesCount: val.imagesCount,
      durationSec: Math.round((Date.now() - val.createdAt) / 1000),
    });
  });
  return rooms;
}

export function clearPresenceState() {
  const clearedQueueCount = waitingQueue.length;
  const clearedRoomsCount = activeRooms.size;
  
  // Notify active rooms that session has been ended by admin reset
  activeRooms.forEach((room, roomId) => {
    const u1 = onlineSockets.get(room.user1.socketId);
    const u2 = onlineSockets.get(room.user2.socketId);
    if (u1) u1.socket.emit('chat_ended', { reason: 'System presence reset by Admin' });
    if (u2) u2.socket.emit('chat_ended', { reason: 'System presence reset by Admin' });
  });

  waitingQueue.length = 0;
  activeRooms.clear();
  socketToRoom.clear();
  blockedPairs.clear();

  if (globalIoInstance) {
    broadcastStats(globalIoInstance);
  }

  return { clearedQueueCount, clearedRoomsCount, onlineSocketsCount: onlineSockets.size };
}

export async function getChatStats() {
  try {
    const totalChatSessions = await ChatRoom.countDocuments();
    const totalMessages = await ChatMessage.countDocuments();
    const imagesShared = await ChatImage.countDocuments();
    const reportsSubmitted = await Report.countDocuments();

    // Calculate Average Duration from MongoDB
    const avgDoc = await ChatRoom.aggregate([
      { $match: { duration: { $gt: 0 } } },
      { $group: { _id: null, avgDuration: { $avg: '$duration' } } },
    ]);
    const avgChatDurationSec = avgDoc.length > 0 ? Math.round(avgDoc[0].avgDuration) : 0;

    // Daily chats calculation
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const dailyChatCount = await ChatRoom.countDocuments({
      createdAt: { $gte: startOfToday.toISOString() },
    });

    return {
      usersOnline: onlineSockets.size,
      waitingCount: waitingQueue.length,
      activeChatsCount: activeRooms.size,
      totalChatSessions,
      totalMessages,
      avgChatDurationSec,
      imagesShared,
      reportsSubmitted,
      dailyChatCount,
      peakOnline: Math.max(onlineSockets.size, 1),
    };
  } catch (err) {
    return {
      usersOnline: onlineSockets.size,
      waitingCount: waitingQueue.length,
      activeChatsCount: activeRooms.size,
      totalChatSessions: 0,
      totalMessages: 0,
      avgChatDurationSec: 0,
      imagesShared: 0,
      reportsSubmitted: 0,
      dailyChatCount: 0,
      peakOnline: Math.max(onlineSockets.size, 1),
    };
  }
}

export async function getChatReports() {
  try {
    const reports = await Report.find().sort({ createdAt: -1 }).limit(50);
    return reports.map((r) => ({
      id: r.id,
      roomId: r.roomId,
      reporterName: r.reporterAlias || 'Anonymous',
      reportedName: r.reportedAlias || 'Anonymous User',
      reason: r.reason,
      timestamp: r.createdAt,
      status: r.status,
    }));
  } catch (err) {
    return [];
  }
}
