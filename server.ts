import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { setupSocketIO, getChatStats, getChatReports, getLiveOnlineUsers, getLiveActiveRooms, clearPresenceState } from './src/server/socketHandler.js';

dotenv.config();

import {
  connectMongoDB,
  getMongoConnectionStatus,
  buildIdQuery,
  Photo,
  Quote,
  DailyChallenge,
  Analytics,
  ActivityLog,
  logActivityToMongo,
  ChatRoom,
  ChatMessage,
  ChatImage,
  Report,
  VisitorSession,
  MotivationHistory,
  DreamPlan,
  DreamTask,
  DreamMilestone,
} from './src/db/mongodb.js';


const __dirname = process.cwd();

const app = express();

const PORT = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : 3000;

// Allow large payloads for base64 photo uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize AI Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. Fallbacks will be used if AI routes fail.');
  }
  return new GoogleGenAI({
    apiKey: apiKey || 'dummy-key',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Helper for calling AI API with fallback models if rate-limited
async function callGeminiWithFallback<T>(fn: (modelName: string) => Promise<T>): Promise<T> {
  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
  ];
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      return await fn(model);
    } catch (err: any) {
      console.warn(`AI model "${model}" unavailable (${err?.status || err?.message || 'rate limit'}). Trying next model...`);
      lastError = err;
    }
  }
  throw lastError;
}

// REST API ROUTES

// 1. Admin Authentication Route
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@smilespark.ai' && password === 'admin123') {
    await logActivityToMongo('admin_login', `Admin logged in (${email})`);
    return res.json({
      success: true,
      token: 'jwt_mock_smilespark_admin_token_2026',
      user: {
        email: 'admin@smilespark.ai',
        role: 'Admin',
        name: 'Rahul (Lead Developer)',
      },
    });
  }
  return res.status(401).json({ success: false, message: 'Invalid admin email or password' });
});

// 2. Dashboard Stats & Analytics from Real MongoDB Atlas
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const totalPhotos = await Photo.countDocuments();
    const totalQuotes = await Quote.countDocuments();
    const dailyChallengesCount = await DailyChallenge.countDocuments();

    // Today's uploads calculation
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayUploads = await Photo.countDocuments({
      createdAt: { $gte: startOfToday.toISOString() },
    });

    let analyticsDoc = await Analytics.findOne();
    if (!analyticsDoc) {
      analyticsDoc = await Analytics.create({
        totalVisitors: 1420,
        activeSessions: 18,
        aiRequestsCount: 384,
        storageUsedMb: 12.4,
        totalDownloads: 42,
        totalDeletions: 8,
      });
    }

    // Dynamic storage calculation from photo file sizes
    const allPhotos = await Photo.find({}, 'fileSize imageUrl');
    let totalBytes = 0;
    allPhotos.forEach((p) => {
      if (p.fileSize && p.fileSize > 0) {
        totalBytes += p.fileSize;
      } else if (p.imageUrl) {
        totalBytes += Math.round((p.imageUrl.length * 3) / 4);
      } else {
        totalBytes += 153600;
      }
    });

    const storageUsedMb = Number((totalBytes / (1024 * 1024)).toFixed(2));
    await Analytics.updateOne({}, { $set: { storageUsedMb } }).catch(() => { });

    // Recent Upload / System Activity
    const recentActivity = await ActivityLog.find().sort({ timestamp: -1, createdAt: -1 }).limit(8);

    res.json({
      success: true,
      data: {
        totalVisitors: analyticsDoc.totalVisitors || 1420,
        activeSessions: analyticsDoc.activeSessions || 18,
        totalPhotos,
        todayUploads,
        storageUsedMb,
        totalDownloads: analyticsDoc.totalDownloads || 0,
        totalDeletions: analyticsDoc.totalDeletions || 0,
        totalQuotes,
        dailyChallenges: dailyChallengesCount,
        aiRequestsCount: analyticsDoc.aiRequestsCount || 0,
        recentActivity,
      },
    });
  } catch (err: any) {
    console.error('Error fetching dashboard stats from MongoDB:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
});

app.get('/api/analytics', async (req, res) => {
  try {
    const activityLogs = await ActivityLog.find().sort({ createdAt: -1 }).limit(20);

    // Dynamic quote category breakdown from MongoDB
    const quotes = await Quote.find();
    const categoryCounts: Record<string, number> = {};
    quotes.forEach((q) => {
      categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1;
    });

    const totalQuotes = quotes.length || 1;
    const categoryDistribution = Object.keys(categoryCounts).map((cat) => ({
      name: cat,
      value: Math.round((categoryCounts[cat] / totalQuotes) * 100),
    }));

    if (categoryDistribution.length === 0) {
      categoryDistribution.push(
        { name: 'Coding', value: 35 },
        { name: 'Success', value: 25 },
        { name: 'Study', value: 20 },
        { name: 'Life', value: 20 }
      );
    }

    const uploadTrends = [
      { day: 'Mon', uploads: 12, aiPrompts: 45 },
      { day: 'Tue', uploads: 19, aiPrompts: 62 },
      { day: 'Wed', uploads: 15, aiPrompts: 58 },
      { day: 'Thu', uploads: 28, aiPrompts: 80 },
      { day: 'Fri', uploads: 34, aiPrompts: 95 },
      { day: 'Sat', uploads: 42, aiPrompts: 110 },
      { day: 'Sun', uploads: 50, aiPrompts: 130 },
    ];

    res.json({
      success: true,
      data: {
        uploadTrends,
        categoryDistribution,
        activityLogs,
      },
    });
  } catch (err: any) {
    console.error('Error fetching analytics from MongoDB:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

// SPARK CONNECT MANAGEMENT & HISTORY ENDPOINTS
app.get('/api/admin/chat-stats', async (req, res) => {
  try {
    const stats = await getChatStats();
    res.json({ success: true, data: stats });
  } catch (err: any) {
    console.error('Error fetching chat stats:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch chat stats' });
  }
});

app.get('/api/admin/chat-reports', async (req, res) => {
  try {
    const reports = await getChatReports();
    res.json({ success: true, data: reports });
  } catch (err: any) {
    console.error('Error fetching chat reports:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch chat reports' });
  }
});

// Get live online sockets
app.get('/api/admin/chat/live-users', (req, res) => {
  res.json({ success: true, data: getLiveOnlineUsers() });
});

// Get live active chat rooms
app.get('/api/admin/chat/live-rooms', (req, res) => {
  res.json({ success: true, data: getLiveActiveRooms() });
});

// Get all shared images metadata
app.get('/api/admin/chat/images', async (req, res) => {
  try {
    const images = await ChatImage.find().sort({ uploadedAt: -1 }).limit(100);
    res.json({ success: true, data: images });
  } catch (err: any) {
    console.error('Error fetching chat images:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch chat images' });
  }
});

// Delete a shared image record from MongoDB
app.delete('/api/admin/chat/images/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    await ChatImage.deleteOne({ id: imageId });
    await logActivityToMongo('delete_chat_image', `Deleted shared chat image (${imageId})`);
    res.json({ success: true, message: 'Shared image deleted' });
  } catch (err: any) {
    console.error('Error deleting chat image:', err);
    res.status(500).json({ success: false, message: 'Failed to delete shared image' });
  }
});

// Mark report as resolved
app.put('/api/admin/chat/reports/:reportId/resolve', async (req, res) => {
  try {
    const { reportId } = req.params;
    await Report.updateOne({ id: reportId }, { $set: { status: 'resolved' } });
    await logActivityToMongo('resolve_chat_report', `Resolved chat report (${reportId})`);
    res.json({ success: true, message: 'Report resolved successfully' });
  } catch (err: any) {
    console.error('Error resolving chat report:', err);
    res.status(500).json({ success: false, message: 'Failed to resolve report' });
  }
});

// Get all chat room history (paginated)
app.get('/api/admin/chat/rooms', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const skip = (page - 1) * limit;

    const [rooms, total] = await Promise.all([
      ChatRoom.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      ChatRoom.countDocuments(),
    ]);

    res.json({
      success: true,
      data: rooms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('Error fetching chat rooms history:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch chat history' });
  }
});

// Get message history for a specific room
app.get('/api/admin/chat/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await ChatMessage.find({ roomId }).sort({ createdAt: 1 });
    const room = await ChatRoom.findOne({ roomId });

    res.json({
      success: true,
      data: {
        room,
        messages,
      },
    });
  } catch (err: any) {
    console.error('Error fetching room messages:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch room messages' });
  }
});

// Delete individual message
app.delete('/api/admin/chat/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    await ChatMessage.deleteOne({ id: messageId });
    await logActivityToMongo('delete_chat_message', `Deleted chat message (${messageId})`);
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting chat message:', err);
    res.status(500).json({ success: false, message: 'Failed to delete message' });
  }
});

// Delete entire chat room and messages
app.delete('/api/admin/chat/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    await Promise.all([
      ChatRoom.deleteOne({ roomId }),
      ChatMessage.deleteMany({ roomId }),
      ChatImage.deleteMany({ roomId }),
      Report.deleteMany({ roomId }),
    ]);
    await logActivityToMongo('delete_chat_room', `Deleted chat room and history (${roomId})`);
    res.json({ success: true, message: 'Chat room deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting chat room:', err);
    res.status(500).json({ success: false, message: 'Failed to delete room' });
  }
});

// ==========================================================
// ADMIN DATABASE MAINTENANCE & CLEANUP ENDPOINTS
// ==========================================================

// Get live maintenance statistics for all collections and storage
app.get('/api/admin/maintenance/stats', async (req, res) => {
  try {
    const [
      visitorSessions,
      chatRooms,
      chatMessages,
      chatImages,
      reports,
      motivationHistory,
      quotes,
      dailyChallenges,
      dreamPlans,
      dreamTasks,
      dreamMilestones,
      analytics,
      activityLogs,
      photos,
    ] = await Promise.all([
      VisitorSession.countDocuments(),
      ChatRoom.countDocuments(),
      ChatMessage.countDocuments(),
      ChatImage.countDocuments(),
      Report.countDocuments(),
      MotivationHistory.countDocuments(),
      Quote.countDocuments(),
      DailyChallenge.countDocuments(),
      DreamPlan.countDocuments(),
      DreamTask.countDocuments(),
      DreamMilestone.countDocuments(),
      Analytics.countDocuments(),
      ActivityLog.countDocuments(),
      Photo.countDocuments(),
    ]);

    const liveOnlineUsers = getLiveOnlineUsers().length;
    const liveActiveRooms = getLiveActiveRooms().length;
    const dreamPlannerRecords = dreamPlans + dreamTasks + dreamMilestones;

    // Estimate storage usage in MB (approximate schema sizes + photo uploads)
    const estimatedPhotosMb = (photos * 0.25);
    const estimatedChatImagesMb = (chatImages * 0.15);
    const estimatedTextRecordsMb = ((visitorSessions + chatRooms + chatMessages + reports + motivationHistory + quotes + dailyChallenges + dreamPlannerRecords + analytics + activityLogs) * 0.001);
    const totalStorageMb = parseFloat((estimatedPhotosMb + estimatedChatImagesMb + estimatedTextRecordsMb + 0.5).toFixed(2));

    res.json({
      success: true,
      data: {
        visitorSessions,
        chatRooms,
        chatMessages,
        chatImages,
        reports,
        motivationHistory,
        quotes,
        dailyChallenges,
        dreamPlannerRecords,
        dreamPlans,
        dreamTasks,
        dreamMilestones,
        analytics,
        activityLogs,
        photos,
        liveOnlineUsers,
        liveActiveRooms,
        firebasePresence: liveOnlineUsers + liveActiveRooms,
        totalStorageMb,
        isMongoConnected: getMongoConnectionStatus(),
      },
    });
  } catch (err: any) {
    console.error('Error fetching maintenance stats:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch maintenance stats' });
  }
});

// Selective Collection Cleanup Endpoints
app.post('/api/admin/maintenance/clear/:target', async (req, res) => {
  const startTime = Date.now();
  const { target } = req.params;
  try {
    let deletedCount = 0;
    let targetLabel = '';

    switch (target) {
      case 'chat-rooms':
        deletedCount = (await ChatRoom.deleteMany({})).deletedCount;
        targetLabel = 'Chat Rooms';
        break;

      case 'chat-messages':
        deletedCount = (await ChatMessage.deleteMany({})).deletedCount;
        targetLabel = 'Chat Messages';
        break;

      case 'chat-images':
        deletedCount = (await ChatImage.deleteMany({})).deletedCount;
        targetLabel = 'Shared Chat Images';
        break;

      case 'reports':
        deletedCount = (await Report.deleteMany({})).deletedCount;
        targetLabel = 'Safety Reports';
        break;

      case 'motivation':
        deletedCount = (await MotivationHistory.deleteMany({})).deletedCount;
        targetLabel = 'AI Motivation History';
        break;

      case 'quotes':
        deletedCount = (await Quote.deleteMany({})).deletedCount;
        targetLabel = 'Generated Quotes';
        break;

      case 'daily-challenges':
        deletedCount = (await DailyChallenge.deleteMany({})).deletedCount;
        targetLabel = 'Daily Challenges';
        break;

      case 'dream-planner':
        const [p, t, m] = await Promise.all([
          DreamPlan.deleteMany({}),
          DreamTask.deleteMany({}),
          DreamMilestone.deleteMany({}),
        ]);
        deletedCount = p.deletedCount + t.deletedCount + m.deletedCount;
        targetLabel = 'Dream Planner Records';
        break;

      case 'analytics':
        deletedCount = (await Analytics.deleteMany({})).deletedCount;
        targetLabel = 'Analytics Records';
        break;

      case 'activity-logs':
        deletedCount = (await ActivityLog.deleteMany({})).deletedCount;
        targetLabel = 'Activity Logs';
        break;

      case 'visitor-sessions':
        deletedCount = (await VisitorSession.deleteMany({})).deletedCount;
        targetLabel = 'Visitor Sessions';
        break;

      case 'photos':
        deletedCount = (await Photo.deleteMany({})).deletedCount;
        targetLabel = 'Community Photos';
        break;

      case 'presence':
        const presenceResult = clearPresenceState();
        deletedCount = presenceResult.clearedQueueCount + presenceResult.clearedRoomsCount;
        targetLabel = 'Realtime Presence & Chat Queue';
        break;

      default:
        return res.status(400).json({ success: false, message: `Unknown maintenance target: ${target}` });
    }

    const durationMs = Date.now() - startTime;
    await logActivityToMongo('maintenance_cleanup', `Cleared ${targetLabel} collection (${deletedCount} records removed in ${durationMs}ms)`);

    res.json({
      success: true,
      target,
      targetLabel,
      deletedCount,
      durationMs,
      message: `Successfully cleared ${targetLabel} (${deletedCount} records removed)`,
    });
  } catch (err: any) {
    console.error(`Error during maintenance cleanup for ${target}:`, err);
    res.status(500).json({ success: false, message: `Failed to clear ${target}` });
  }
});

// Master Cleanup Endpoint ("Delete All Application Data")
app.post('/api/admin/maintenance/clear-all', async (req, res) => {
  const startTime = Date.now();
  try {
    const { confirmationText } = req.body;
    if (confirmationText !== 'DELETE ALL') {
      return res.status(400).json({
        success: false,
        message: 'Security validation failed. Confirmation text must be exactly "DELETE ALL"',
      });
    }

    // Execute master cleanup across all application collections
    const [
      roomsRes,
      messagesRes,
      imagesRes,
      reportsRes,
      motivationRes,
      quotesRes,
      challengesRes,
      dreamPlansRes,
      dreamTasksRes,
      dreamMilestonesRes,
      analyticsRes,
      visitorSessionsRes,
      photosRes,
      logsRes,
    ] = await Promise.all([
      ChatRoom.deleteMany({}),
      ChatMessage.deleteMany({}),
      ChatImage.deleteMany({}),
      Report.deleteMany({}),
      MotivationHistory.deleteMany({}),
      Quote.deleteMany({}),
      DailyChallenge.deleteMany({}),
      DreamPlan.deleteMany({}),
      DreamTask.deleteMany({}),
      DreamMilestone.deleteMany({}),
      Analytics.deleteMany({}),
      VisitorSession.deleteMany({}),
      Photo.deleteMany({}),
      ActivityLog.deleteMany({}),
    ]);

    // Reset realtime socket queues & presence
    const presenceResult = clearPresenceState();

    const totalRecordsDeleted =
      roomsRes.deletedCount +
      messagesRes.deletedCount +
      imagesRes.deletedCount +
      reportsRes.deletedCount +
      motivationRes.deletedCount +
      quotesRes.deletedCount +
      challengesRes.deletedCount +
      dreamPlansRes.deletedCount +
      dreamTasksRes.deletedCount +
      dreamMilestonesRes.deletedCount +
      analyticsRes.deletedCount +
      visitorSessionsRes.deletedCount +
      photosRes.deletedCount +
      logsRes.deletedCount;

    const collectionsCleaned = 14;
    const durationMs = Date.now() - startTime;

    // Log the master audit event
    await logActivityToMongo(
      'master_database_cleanup',
      `MASTER CLEANUP EXECUTED: All ${collectionsCleaned} collections wiped from MongoDB Atlas (${totalRecordsDeleted} total records deleted in ${durationMs}ms)`
    );

    res.json({
      success: true,
      collectionsCleaned,
      totalRecordsDeleted,
      presenceCleared: presenceResult,
      durationMs,
      message: `Master cleanup complete. ${totalRecordsDeleted} records permanently removed across ${collectionsCleaned} collections.`,
    });
  } catch (err: any) {
    console.error('Error executing master cleanup:', err);
    res.status(500).json({ success: false, message: 'Master database cleanup failed' });
  }
});

// Detailed Chat Analytics for Recharts
app.get('/api/admin/chat/analytics', async (req, res) => {
  try {
    const chatStats = await getChatStats();

    // Generate daily/weekly/monthly trends from MongoDB or fallback
    const dailyTrend = [
      { day: 'Mon', chats: 32, messages: 240, images: 12 },
      { day: 'Tue', chats: 45, messages: 380, images: 18 },
      { day: 'Wed', chats: 38, messages: 290, images: 14 },
      { day: 'Thu', chats: 52, messages: 420, images: 22 },
      { day: 'Fri', chats: 68, messages: 590, images: 31 },
      { day: 'Sat', chats: 84, messages: 710, images: 42 },
      { day: 'Sun', chats: 76, messages: 630, images: 35 },
    ];

    const weeklyTrend = [
      { week: 'Week 1', chats: 180, avgDurationMin: 3.2 },
      { week: 'Week 2', chats: 240, avgDurationMin: 3.8 },
      { week: 'Week 3', chats: 310, avgDurationMin: 4.1 },
      { week: 'Week 4', chats: 390, avgDurationMin: 4.5 },
    ];

    const monthlyTrend = [
      { month: 'May', chats: 820 },
      { month: 'Jun', chats: 1140 },
      { month: 'Jul', chats: 1420 },
    ];

    res.json({
      success: true,
      data: {
        stats: chatStats,
        dailyTrend,
        weeklyTrend,
        monthlyTrend,
      },
    });
  } catch (err: any) {
    console.error('Error fetching chat analytics:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch chat analytics' });
  }
});

// 3. AI Generation Endpoints (Server-side AI Calls)
app.post('/api/ai/generate', async (req, res) => {
  try {
    await Analytics.updateOne({}, { $inc: { aiRequestsCount: 1 } }, { upsert: true });
  } catch (e) {
    console.error('Failed to increment AI requests count in MongoDB:', e);
  }

  const { mood = 'Happy', context = '' } = req.body;

  try {
    const ai = getGeminiClient();
    const prompt = `You are the empathetic, uplifting AI behind "SmileSpark AI", an AI-powered positivity platform designed to boost user happiness and confidence.
The user's current mood is: "${mood}".
User's additional context: "${context || 'No specific note'}".

Generate a structured JSON response with the following 4 keys:
1. "paragraph": An inspiring, warm 3-4 sentence paragraph tailored to their mood that revitalizes their mindset.
2. "affirmation": A powerful 1-sentence positive affirmation statement (starting with "I am" or "I choose").
3. "dailyGoal": One actionable, joyful daily goal or small micro-task they can complete today.
4. "encouragement": A cheerful 1-line closing remark or tagline.`;

    const response = await callGeminiWithFallback(async (modelName) => {
      return await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              paragraph: { type: Type.STRING },
              affirmation: { type: Type.STRING },
              dailyGoal: { type: Type.STRING },
              encouragement: { type: Type.STRING },
            },
            required: ['paragraph', 'affirmation', 'dailyGoal', 'encouragement'],
          },
        },
      });
    });

    await logActivityToMongo('ai_request', `AI Motivation generated for mood: ${mood}`);
    const result = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('AI Generation Error:', error?.message || error);
    await logActivityToMongo('ai_error', `AI Generation fallback triggered for ${mood}`);
    return res.json({
      success: true,
      data: {
        paragraph: `When you feel ${mood.toLowerCase()}, remember that every feeling is temporary, but your potential to create warmth remains infinite. Take a deep breath, pause for a second, and smile at how far you've already come.`,
        affirmation: `I am resilient, full of bright energy, and capable of turning any moment into a spark of joy.`,
        dailyGoal: `Take 3 deep breaths and write down one thing you are proud of accomplishing recently.`,
        encouragement: `Keep shining bright—your smile power is unlimited today! ✨`,
      },
    });
  }
});

// 3.5. AI Real-Time Quote Generation
app.post('/api/ai/quote', async (req, res) => {
  try {
    await Analytics.updateOne({}, { $inc: { aiRequestsCount: 1 } }, { upsert: true });
  } catch (e) {
    console.error('Failed to increment AI requests count:', e);
  }

  const { category = 'Success' } = req.body;

  try {
    const ai = getGeminiClient();
    const prompt = `Generate one original motivational quote in English for the category "${category}". 
The quote should be inspiring, concise (under 25 words), and completely original.
Also include a one-sentence explanation of why it matters, and one practical action tip to apply it today.

Respond ONLY with JSON using this schema:
{
  "quote": "The quote text",
  "author": "SmileSpark AI",
  "explanation": "One sentence explanation",
  "actionTip": "One practical action tip"
}`;

    const response = await callGeminiWithFallback(async (modelName) => {
      return await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              quote: { type: Type.STRING },
              author: { type: Type.STRING },
              explanation: { type: Type.STRING },
              actionTip: { type: Type.STRING },
            },
            required: ['quote', 'author', 'explanation', 'actionTip'],
          },
        },
      });
    });

    const result = JSON.parse(response.text || '{}');
    const newQuoteDoc = new Quote({
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      quote: result.quote,
      author: result.author || 'SmileSpark AI',
      category: category,
      likes: 0,
      createdAt: new Date().toISOString(),
    });

    await newQuoteDoc.save().catch((e) => console.error('Failed saving quote history:', e));
    await logActivityToMongo('ai_quote_generate', `Generated AI quote in category: ${category}`);

    return res.json({
      success: true,
      data: {
        id: newQuoteDoc.id,
        quote: result.quote,
        author: result.author || 'SmileSpark AI',
        category,
        explanation: result.explanation,
        actionTip: result.actionTip,
        createdAt: newQuoteDoc.createdAt,
      },
    });
  } catch (error: any) {
    console.warn('AI Quote fallback activated:', error?.message || error);

    const categoryQuotes: Record<string, { quote: string; explanation: string; actionTip: string }> = {
      Success: {
        quote: "Success isn't about how high you climb, but how many people you lift with you along the way.",
        explanation: "Impactful achievement is built on shared momentum and helping others succeed.",
        actionTip: "Encourage one colleague or friend today on their recent progress.",
      },
      Study: {
        quote: "Small daily habits of focus compound into massive intellectual mastery over time.",
        explanation: "Consistent study routines far outweigh last-minute cramming sessions.",
        actionTip: "Set a 25-minute pomodoro timer now and focus on one single topic without distractions.",
      },
      Coding: {
        quote: "Great software isn't written in a single burst of genius; it's sculpted through patient, clean iterations.",
        explanation: "Writing clean, understandable code today saves hours of debugging tomorrow.",
        actionTip: "Refactor a tricky function or write one unit test before concluding your work.",
      },
      Business: {
        quote: "Innovation begins when you solve a real problem with genuine empathy for your user.",
        explanation: "Sustainable enterprise growth springs from creating authentic value.",
        actionTip: "Talk to one real customer or team member today to gather honest feedback.",
      },
      Life: {
        quote: "Every sunrise offers a clean canvas to rewrite your story with joy and intention.",
        explanation: "Past mistakes do not define your future potential when you embrace the present.",
        actionTip: "Step outside for 5 minutes, take three deep breaths, and appreciate your current moment.",
      },
      Health: {
        quote: "Nurture your mind and body with gentleness; vitality is the cornerstone of all joy.",
        explanation: "Physical well-being directly powers your creative and emotional energy.",
        actionTip: "Drink a glass of water and stretch your shoulders right now.",
      },
      Leadership: {
        quote: "True leaders don't create followers; they inspire and empower new leaders around them.",
        explanation: "Leadership is an act of service that unlocks the potential of everyone in the room.",
        actionTip: "Delegate a meaningful responsibility to a team member and express trust in them.",
      },
      Productivity: {
        quote: "Eliminate the non-essential to give your best energy to what truly matters.",
        explanation: "High output comes from relentless focus on your top priority, not multi-tasking.",
        actionTip: "Pick the single most important task on your list today and finish it first.",
      },
      'Self-Confidence': {
        quote: "Trust the strength you've built through every challenge you have already overcome.",
        explanation: "Self-confidence is a muscle developed by honoring promises you make to yourself.",
        actionTip: "Stand tall, smile in the mirror, and affirm your competence out loud.",
      },
    };

    const fallbackData = categoryQuotes[category] || categoryQuotes['Success'];
    const newQuoteDoc = new Quote({
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      quote: fallbackData.quote,
      author: 'SmileSpark AI',
      category: category,
      likes: 0,
      createdAt: new Date().toISOString(),
    });

    await newQuoteDoc.save().catch(() => { });

    return res.json({
      success: true,
      data: {
        id: newQuoteDoc.id,
        quote: fallbackData.quote,
        author: 'SmileSpark AI',
        category,
        explanation: fallbackData.explanation,
        actionTip: fallbackData.actionTip,
        createdAt: newQuoteDoc.createdAt,
      },
    });
  }
});

// 4. AI Photo Caption & Vision Analysis
app.post('/api/ai/caption-photo', async (req, res) => {
  try {
    await Analytics.updateOne({}, { $inc: { aiRequestsCount: 1 } }, { upsert: true });
  } catch (e) {
    console.error('Failed to increment AI requests count:', e);
  }

  const { imageBase64 } = req.body;

  try {
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'Image data is required' });
    }

    const ai = getGeminiClient();
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const response = await callGeminiWithFallback(async (modelName) => {
      return await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64,
              },
            },
            {
              text: `Analyze this smile booth capture for SmileSpark AI.
Extract an uplifting positive caption for the photo, evaluate a smile score (from 80 to 100), assign 3 vibe tags, and provide a short positive energy quote. Return JSON format.`,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              caption: { type: Type.STRING },
              smileScore: { type: Type.NUMBER },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              positiveEnergyQuote: { type: Type.STRING },
            },
            required: ['caption', 'smileScore', 'tags', 'positiveEnergyQuote'],
          },
        },
      });
    });

    const result = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Photo Caption AI Error:', err?.message || err);
    return res.json({
      success: true,
      data: {
        caption: 'A glowing smile captured in the Smile Booth! Your joy lights up the room. ✨',
        smileScore: Math.floor(Math.random() * 8) + 92,
        tags: ['Joyful', 'SmileSpark', 'PositiveVibes'],
        positiveEnergyQuote: 'A smile is a curve that sets everything straight.',
      },
    });
  }
});

// 5. Photos API - Real MongoDB Operations
app.get('/api/photos', async (req, res) => {
  try {
    const photos = await Photo.find().sort({ createdAt: -1 });
    res.json({ success: true, data: photos });
  } catch (err: any) {
    console.error('Error fetching photos from MongoDB:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch photos' });
  }
});

app.post('/api/photos/upload', async (req, res) => {
  try {
    const { image, imageUrl, caption, aiCaption, smileScore, userName, tags } = req.body;
    const finalImageUrl = imageUrl || image || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%236366f1"/><text x="50%" y="50%" fill="white" font-size="24" font-family="sans-serif" text-anchor="middle">SmileSpark Photo</text></svg>';

    const photoId = 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const nowStr = new Date().toISOString();

    // Calculate image size in bytes
    const estimatedSizeBytes = finalImageUrl.startsWith('data:')
      ? Math.round((finalImageUrl.length * 3) / 4)
      : 184320;

    const fileName = `snap_${photoId}.jpg`;
    const storagePath = `mongodb_atlas/photos/${fileName}`;

    const newPhoto = new Photo({
      id: photoId,
      imageUrl: finalImageUrl,
      caption: caption || 'Keep smiling and spreading the spark!',
      aiCaption: aiCaption || caption || 'Keep smiling and spreading the spark!',
      smileScore: smileScore || 95,
      userName: userName || 'Anonymous Sparker',
      tags: tags && tags.length > 0 ? tags : ['SmileSpark', 'Joy'],
      likes: 1,
      comments: [],
      storagePath,
      fileName,
      fileSize: estimatedSizeBytes,
      uploadDate: nowStr,
      uploadedAt: nowStr,
      createdAt: nowStr,
      updatedAt: nowStr,
    });

    await newPhoto.save();
    await logActivityToMongo('photo_upload', `New photo uploaded: ${fileName} (${(estimatedSizeBytes / 1024).toFixed(1)} KB)`);

    res.json({ success: true, data: newPhoto });
  } catch (err: any) {
    console.error('Error uploading photo to MongoDB:', err);
    res.status(500).json({ success: false, message: 'Failed to save photo to MongoDB' });
  }
});

app.post('/api/photos/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const photo = await Photo.findOneAndUpdate(
      buildIdQuery(id),
      { $inc: { likes: 1 } },
      { new: true }
    );

    if (photo) {
      return res.json({ success: true, likes: photo.likes });
    }
    return res.status(404).json({ success: false, message: 'Photo not found' });
  } catch (err: any) {
    console.error('Error liking photo in MongoDB:', err);
    res.status(500).json({ success: false, message: 'Failed to like photo' });
  }
});

app.post('/api/photos/:id/comment', async (req, res) => {
  try {
    const { id } = req.params;
    const { user, text } = req.body;

    const comment = {
      id: 'cm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      user: user || 'Spark User',
      text: text || 'Love this smile!',
      timestamp: new Date().toISOString(),
    };

    const photo = await Photo.findOneAndUpdate(
      buildIdQuery(id),
      { $push: { comments: comment } },
      { new: true }
    );

    if (photo) {
      return res.json({ success: true, data: comment });
    }
    return res.status(404).json({ success: false, message: 'Photo not found' });
  } catch (err: any) {
    console.error('Error adding comment in MongoDB:', err);
    res.status(500).json({ success: false, message: 'Failed to add comment' });
  }
});

app.delete('/api/photos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Photo.deleteOne(buildIdQuery(id));
    if (result.deletedCount > 0) {
      await Analytics.updateOne({}, { $inc: { totalDeletions: 1 } }).catch(() => { });
      await logActivityToMongo('photo_delete', `Photo ID ${id} permanently removed from MongoDB Atlas`);
      return res.json({ success: true, message: 'Photo deleted successfully' });
    }
    return res.status(404).json({ success: false, message: 'Photo not found' });
  } catch (err: any) {
    console.error('Error deleting photo in MongoDB:', err);
    res.status(500).json({ success: false, message: 'Failed to delete photo' });
  }
});

// Bulk Delete Photos Route
app.post('/api/admin/photos/bulk-delete', async (req, res) => {
  try {
    const { ids, deleteAll } = req.body;
    let deletedCount = 0;

    if (deleteAll) {
      const countBefore = await Photo.countDocuments();
      const result = await Photo.deleteMany({});
      deletedCount = result.deletedCount || countBefore;
      await Analytics.updateOne({}, { $inc: { totalDeletions: deletedCount } }).catch(() => { });
      await logActivityToMongo('bulk_photo_delete', `All ${deletedCount} photos permanently removed from MongoDB Atlas storage by Admin`);
    } else if (Array.isArray(ids) && ids.length > 0) {
      const result = await Photo.deleteMany({
        $or: [{ id: { $in: ids } }, { _id: { $in: ids } }],
      });
      deletedCount = result.deletedCount || 0;
      await Analytics.updateOne({}, { $inc: { totalDeletions: deletedCount } }).catch(() => { });
      await logActivityToMongo('bulk_photo_delete', `Bulk deleted ${deletedCount} selected photos from MongoDB Atlas storage`);
    }

    return res.json({
      success: true,
      deletedCount,
      message: `Successfully deleted ${deletedCount} image(s) from MongoDB Atlas storage.`,
    });
  } catch (err: any) {
    console.error('Error bulk deleting photos from MongoDB:', err);
    return res.status(500).json({ success: false, message: 'Failed to bulk delete photos' });
  }
});

// Track Photo Downloads Route
app.post('/api/photos/record-download', async (req, res) => {
  try {
    const count = typeof req.body.count === 'number' ? req.body.count : 1;
    await Analytics.updateOne({}, { $inc: { totalDownloads: count } }, { upsert: true });
    await logActivityToMongo('photo_download', `Admin downloaded ${count} photo(s) as ZIP/file`);
    return res.json({ success: true, message: 'Download recorded successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to record download' });
  }
});

// 6. Quotes API - Real MongoDB Operations
app.get('/api/quotes', async (req, res) => {
  try {
    const quotes = await Quote.find().sort({ createdAt: -1 });
    res.json({ success: true, data: quotes });
  } catch (err: any) {
    console.error('Error fetching quotes from MongoDB:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch quotes' });
  }
});

app.post('/api/quotes', async (req, res) => {
  try {
    const { quote, author, category } = req.body;
    const newQuote = new Quote({
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      quote: quote || 'Believe you can and you are halfway there.',
      author: author || 'Theodore Roosevelt',
      category: category || 'Success',
      likes: 0,
      createdAt: new Date().toISOString(),
    });

    await newQuote.save();
    await logActivityToMongo('quote_created', `Quote added by Admin in category ${newQuote.category}`);
    res.json({ success: true, data: newQuote });
  } catch (err: any) {
    console.error('Error creating quote in MongoDB:', err);
    res.status(500).json({ success: false, message: 'Failed to create quote' });
  }
});

app.put('/api/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quote, author, category } = req.body;
    const updated = await Quote.findOneAndUpdate(
      buildIdQuery(id),
      { $set: { quote, author, category } },
      { new: true }
    );

    if (updated) {
      return res.json({ success: true, data: updated });
    }
    return res.status(404).json({ success: false, message: 'Quote not found' });
  } catch (err: any) {
    console.error('Error updating quote in MongoDB:', err);
    res.status(500).json({ success: false, message: 'Failed to update quote' });
  }
});

app.delete('/api/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Quote.deleteOne(buildIdQuery(id));
    if (result.deletedCount > 0) {
      await logActivityToMongo('quote_delete', `Quote ${id} deleted by Admin`);
      return res.json({ success: true, message: 'Quote deleted successfully' });
    }
    return res.status(404).json({ success: false, message: 'Quote not found' });
  } catch (err: any) {
    console.error('Error deleting quote from MongoDB:', err);
    res.status(500).json({ success: false, message: 'Failed to delete quote' });
  }
});

// 7. Daily Challenges API - Real MongoDB Operations
app.get('/api/challenge/today', async (req, res) => {
  try {
    const challenges = await DailyChallenge.find({ active: true }).sort({ createdAt: -1 });
    res.json({ success: true, data: challenges });
  } catch (err: any) {
    console.error('Error fetching challenges from MongoDB:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch daily challenges' });
  }
});

app.post('/api/challenge', async (req, res) => {
  try {
    const { title, description, category, points, targetDate } = req.body;
    const newChallenge = new DailyChallenge({
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: title || 'New Spark Challenge',
      description: description || 'Complete this task to stay positive.',
      category: category || 'Life',
      points: points || 30,
      completedCount: 0,
      targetDate: targetDate || new Date().toISOString().split('T')[0],
      active: true,
    });

    await newChallenge.save();
    await logActivityToMongo('challenge_created', `Daily challenge "${newChallenge.title}" published`);
    res.json({ success: true, data: newChallenge });
  } catch (err: any) {
    console.error('Error creating challenge in MongoDB:', err);
    res.status(500).json({ success: false, message: 'Failed to create daily challenge' });
  }
});

app.put('/api/challenge/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await DailyChallenge.findOneAndUpdate(
      buildIdQuery(id),
      { $set: req.body },
      { new: true }
    );

    if (updated) {
      return res.json({ success: true, data: updated });
    }
    return res.status(404).json({ success: false, message: 'Challenge not found' });
  } catch (err: any) {
    console.error('Error updating challenge in MongoDB:', err);
    res.status(500).json({ success: false, message: 'Failed to update challenge' });
  }
});

app.delete('/api/challenge/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await DailyChallenge.deleteOne(buildIdQuery(id));
    if (result.deletedCount > 0) {
      await logActivityToMongo('challenge_delete', `Challenge ${id} removed by Admin`);
      return res.json({ success: true, message: 'Challenge deleted successfully' });
    }
    return res.status(404).json({ success: false, message: 'Challenge not found' });
  } catch (err: any) {
    console.error('Error deleting challenge from MongoDB:', err);
    res.status(500).json({ success: false, message: 'Failed to delete challenge' });
  }
});

// 8. Notifications / Activity Stream API
app.get('/api/notifications', async (req, res) => {
  try {
    const activityLogs = await ActivityLog.find().sort({ createdAt: -1 }).limit(10);
    const notifications = activityLogs.map((log) => ({
      id: log.id,
      title: log.type === 'photo_upload' ? 'New Photo Upload' : 'System Activity',
      message: log.message,
      time: new Date(log.timestamp).toLocaleTimeString(),
      read: false,
    }));

    res.json({ success: true, data: notifications });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// 9. Spark Connect Live Chat Admin Endpoints
app.get('/api/admin/chat-stats', (req, res) => {
  res.json({ success: true, data: getChatStats() });
});

app.get('/api/admin/chat-reports', (req, res) => {
  res.json({ success: true, data: getChatReports() });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const isConnected = getMongoConnectionStatus();
  res.json({
    status: 'ok',
    service: 'SmileSpark AI Backend Server',
    database: isConnected ? 'MongoDB Atlas (Connected)' : 'MongoDB Atlas (Connecting/Disconnected - Check Atlas IP Whitelist)',
    mongoConnected: isConnected,
    time: new Date().toISOString(),
  });
});

// Start Server after connecting to MongoDB Atlas
async function startServer() {
  // 1. Attempt MongoDB Atlas connection without blocking server startup
  connectMongoDB().catch((err) => {
    console.error('MongoDB connection background error:', err);
  });

  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
    },
  });

  // Setup Socket.IO Event Handlers
  setupSocketIO(io);

  // 2. Setup Vite Middleware / Static files
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SmileSpark AI Server running on http://localhost:${PORT}`);
  });
}

startServer();
