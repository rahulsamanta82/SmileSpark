import mongoose from 'mongoose';

// Ensure dotenv is configured
import dotenv from 'dotenv';
dotenv.config();

export function getMongoUri(): string {
  let raw = process.env.MONGODB_URI || 'mongodb+srv://apple825030_db_user:IrsNjh7LKKLUcpvm@cluster0.t1oa7sd.mongodb.net/smilespark?retryWrites=true&w=majority&appName=Cluster0';
  raw = raw.trim();
  while ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1).trim();
  }
  if (!raw.startsWith('mongodb://') && !raw.startsWith('mongodb+srv://')) {
    return 'mongodb+srv://apple825030_db_user:IrsNjh7LKKLUcpvm@cluster0.t1oa7sd.mongodb.net/smilespark?retryWrites=true&w=majority&appName=Cluster0';
  }
  return raw;
}

// Schemas & Models

// 1. Photo Schema
const commentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  user: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: String, default: () => new Date().toISOString() },
});

const photoSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  imageUrl: { type: String, required: true },
  caption: { type: String, default: '' },
  aiCaption: { type: String, default: '' },
  smileScore: { type: Number, default: 95 },
  userName: { type: String, default: 'Anonymous Sparker' },
  tags: { type: [String], default: [] },
  likes: { type: Number, default: 0 },
  comments: [commentSchema],
  storagePath: { type: String, default: '' },
  fileName: { type: String, default: '' },
  fileSize: { type: Number, default: 153600 }, // Default size in bytes (~150 KB)
  uploadDate: { type: String, default: () => new Date().toISOString() },
  uploadedAt: { type: String, default: () => new Date().toISOString() },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});

photoSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret.id || ret._id.toString();
    ret.uploadDate = ret.uploadDate || ret.uploadedAt || ret.createdAt;
    ret.storagePath = ret.storagePath || `mongodb_atlas/photos/${ret.id}.jpg`;
    ret.fileName = ret.fileName || `smile_capture_${ret.id}.jpg`;
    ret.fileSize = ret.fileSize || 153600;
    ret.updatedAt = ret.updatedAt || ret.createdAt;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// 2. Quote Schema
const quoteSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  quote: { type: String, required: true },
  author: { type: String, required: true },
  category: { type: String, required: true },
  likes: { type: Number, default: 0 },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

quoteSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret.id || ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// 3. DailyChallenge Schema
const dailyChallengeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, default: 'General' },
  points: { type: Number, default: 10 },
  completedCount: { type: Number, default: 0 },
  targetDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
  active: { type: Boolean, default: true },
});

dailyChallengeSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret.id || ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// 4. Analytics Schema
const analyticsSchema = new mongoose.Schema({
  totalVisitors: { type: Number, default: 1420 },
  activeSessions: { type: Number, default: 18 },
  aiRequestsCount: { type: Number, default: 384 },
  storageUsedMb: { type: Number, default: 12.4 },
  totalDownloads: { type: Number, default: 42 },
  totalDeletions: { type: Number, default: 8 },
});

// 5. ActivityLog Schema
const activityLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: String, default: () => new Date().toISOString() },
});

activityLogSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret.id || ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// 6. Settings Schema
const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed },
});

// 7. ChatRoom Schema
const chatRoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  user1SessionId: { type: String, required: true },
  user2SessionId: { type: String, required: true },
  user1Alias: { type: String, required: true },
  user2Alias: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
  endedAt: { type: String, default: null },
  duration: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'ended'], default: 'active' },
  totalMessages: { type: Number, default: 0 },
  totalImages: { type: Number, default: 0 },
});

chatRoomSchema.set('toJSON', {
  transform: (doc, ret: any) => {
    ret.id = ret.roomId || ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// 8. ChatMessage Schema
const chatMessageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  roomId: { type: String, required: true, index: true },
  senderSessionId: { type: String, required: true },
  senderAlias: { type: String, required: true },
  messageType: { type: String, enum: ['text', 'image', 'system'], default: 'text' },
  message: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

chatMessageSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret.id || ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// 9. ChatImage Schema
const chatImageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  roomId: { type: String, required: true, index: true },
  senderSessionId: { type: String, required: true },
  senderAlias: { type: String, required: true },
  imageUrl: { type: String, required: true },
  uploadedAt: { type: String, default: () => new Date().toISOString() },
});

chatImageSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret.id || ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// 10. Report Schema
const reportSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  roomId: { type: String, required: true },
  reporterSessionId: { type: String, default: '' },
  reportedSessionId: { type: String, default: '' },
  reporterAlias: { type: String, default: '' },
  reportedAlias: { type: String, default: '' },
  reason: { type: String, required: true },
  description: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toISOString() },
  status: { type: String, enum: ['pending', 'resolved'], default: 'pending' },
});

reportSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret.id || ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// 11. VisitorSession Schema
const visitorSessionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  sessionId: { type: String, required: true },
  userAgent: { type: String, default: '' },
  ip: { type: String, default: '' },
  visitedAt: { type: String, default: () => new Date().toISOString() },
});

// 12. MotivationHistory Schema
const motivationHistorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  mood: { type: String, required: true },
  feeling: { type: String, default: '' },
  aiAdvice: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

// 13. DreamPlan, DreamTask, DreamMilestone Schemas
const dreamPlanSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  category: { type: String, default: 'General' },
  targetDate: { type: String, default: '' },
  status: { type: String, default: 'in_progress' },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

const dreamTaskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  planId: { type: String, required: true },
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
});

const dreamMilestoneSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  planId: { type: String, required: true },
  title: { type: String, required: true },
  achieved: { type: Boolean, default: false },
});

// Models bound explicitly to requested collection names
export const Photo = mongoose.model('Photo', photoSchema, 'photos');
export const Quote = mongoose.model('Quote', quoteSchema, 'quotes');
export const DailyChallenge = mongoose.model('DailyChallenge', dailyChallengeSchema, 'dailyChallenges');
export const Analytics = mongoose.model('Analytics', analyticsSchema, 'analytics');
export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema, 'activityLogs');
export const Settings = mongoose.model('Settings', settingsSchema, 'settings');
export const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema, 'chatRooms');
export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema, 'chatMessages');
export const ChatImage = mongoose.model('ChatImage', chatImageSchema, 'chatImages');
export const Report = mongoose.model('Report', reportSchema, 'reports');
export const VisitorSession = mongoose.model('VisitorSession', visitorSessionSchema, 'visitorSessions');
export const MotivationHistory = mongoose.model('MotivationHistory', motivationHistorySchema, 'motivationHistory');
export const DreamPlan = mongoose.model('DreamPlan', dreamPlanSchema, 'dreamPlans');
export const DreamTask = mongoose.model('DreamTask', dreamTaskSchema, 'dreamTasks');
export const DreamMilestone = mongoose.model('DreamMilestone', dreamMilestoneSchema, 'dreamMilestones');

let isMongoConnected = false;

export function getMongoConnectionStatus() {
  return isMongoConnected;
}

export function buildIdQuery(id: string) {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return { $or: [{ id }, { _id: id }] };
  }
  return { id };
}

// Initialize MongoDB Atlas connection
export async function connectMongoDB() {
  try {
    const mongoUri = getMongoUri();
    console.log(`Connecting to MongoDB Atlas...`);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isMongoConnected = true;
    console.log('✅ MongoDB Atlas connected successfully to database: smilespark');

    // Ensure all required collections exist in database
    const db = mongoose.connection.db;
    if (db) {
      const existingCollections = (await db.listCollections().toArray()).map(c => c.name);
      const requiredCollections = ['photos', 'quotes', 'dailyChallenges', 'analytics', 'activityLogs', 'settings'];

      for (const coll of requiredCollections) {
        if (!existingCollections.includes(coll)) {
          await db.createCollection(coll);
          console.log(`Created MongoDB collection: ${coll}`);
        }
      }
    }

    // Seed initial records if empty
    await seedInitialData();

  } catch (error: any) {
    isMongoConnected = false;
    console.error('❌ Failed to connect to MongoDB Atlas:', error.message || error);
    console.error('⚠️ Notice: Ensure IP 0.0.0.0/0 is added to your MongoDB Atlas Network Access (whitelist) in the Atlas Console.');
  }
}

// Activity Logging helper to insert directly into MongoDB
export async function logActivityToMongo(type: string, message: string) {
  try {
    const log = new ActivityLog({
      id: 'l_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type,
      message,
      timestamp: new Date().toISOString(),
    });
    await log.save();
  } catch (err) {
    console.error('Error logging activity to MongoDB:', err);
  }
}

// Seed initial dataset if collections are empty
async function seedInitialData() {
  try {
    // Seed Analytics
    const analyticsCount = await Analytics.countDocuments();
    if (analyticsCount === 0) {
      await Analytics.create({
        totalVisitors: 1420,
        activeSessions: 18,
        aiRequestsCount: 384,
        storageUsedMb: 12.4,
      });
      console.log('Seeded initial analytics document into MongoDB Atlas');
    }

    // Seed Quotes
    const quotesCount = await Quote.countDocuments();
    if (quotesCount === 0) {
      await Quote.insertMany([
        {
          id: 'q1',
          quote: 'The secret of getting ahead is getting started.',
          author: 'Mark Twain',
          category: 'Success',
          likes: 42,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'q2',
          quote: 'First, solve the problem. Then, write the code.',
          author: 'John Johnson',
          category: 'Coding',
          likes: 89,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'q3',
          quote: 'The mind is everything. What you think you become.',
          author: 'Buddha',
          category: 'Life',
          likes: 67,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'q4',
          quote: 'Success is not final, failure is not fatal: it is the courage to continue that counts.',
          author: 'Winston Churchill',
          category: 'Business',
          likes: 53,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'q5',
          quote: 'An investment in knowledge pays the best interest.',
          author: 'Benjamin Franklin',
          category: 'Study',
          likes: 71,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'q6',
          quote: 'Take care of your body. It is the only place you have to live in.',
          author: 'Jim Rohn',
          category: 'Health',
          likes: 38,
          createdAt: new Date().toISOString(),
        },
      ]);
      console.log('Seeded initial quotes into MongoDB Atlas');
    }

    // Seed Daily Challenges
    const challengesCount = await DailyChallenge.countDocuments();
    if (challengesCount === 0) {
      await DailyChallenge.insertMany([
        {
          id: 'c1',
          title: 'Smile at 3 Strangers or Teammates',
          description: 'Spread positive energy by sharing a genuine smile with 3 people today.',
          category: 'Smile',
          points: 50,
          completedCount: 124,
          targetDate: new Date().toISOString().split('T')[0],
          active: true,
        },
        {
          id: 'c2',
          title: 'Hydrate for Focus (2L Water)',
          description: 'Keep your mind fresh while coding or studying by drinking at least 2 liters of water.',
          category: 'Health',
          points: 30,
          completedCount: 210,
          targetDate: new Date().toISOString().split('T')[0],
          active: true,
        },
        {
          id: 'c3',
          title: 'Read 15 Pages of an Educational Book',
          description: 'Feed your brain with inspiring ideas or new technical concepts.',
          category: 'Study',
          points: 40,
          completedCount: 88,
          targetDate: new Date().toISOString().split('T')[0],
          active: true,
        },
        {
          id: 'c4',
          title: 'Express Gratitude to Someone',
          description: 'Send a quick thank-you text or note to a mentor, family member, or colleague.',
          category: 'Life',
          points: 45,
          completedCount: 95,
          targetDate: new Date().toISOString().split('T')[0],
          active: true,
        },
      ]);
      console.log('Seeded initial daily challenges into MongoDB Atlas');
    }

    // Remove any legacy sample pictures permanently from MongoDB Atlas
    const deletedSamplePhotos = await Photo.deleteMany({
      $or: [
        { id: { $in: ['p1', 'p2', 'p3'] } },
        { imageUrl: { $regex: 'unsplash', $options: 'i' } }
      ]
    });
    if (deletedSamplePhotos.deletedCount > 0) {
      console.log(`Cleaned up ${deletedSamplePhotos.deletedCount} sample photos from MongoDB Atlas`);
    }

    // Seed ActivityLogs
    const logsCount = await ActivityLog.countDocuments();
    if (logsCount === 0) {
      await ActivityLog.insertMany([
        {
          id: 'l1',
          type: 'system_start',
          message: 'MongoDB Atlas initial connection established and collections initialized',
          timestamp: new Date().toISOString(),
        }
      ]);
      console.log('Seeded activity logs into MongoDB Atlas');
    }

  } catch (err) {
    console.error('Error seeding initial data to MongoDB Atlas:', err);
  }
}
