export interface Quote {
  id: string;
  quote: string;
  author: string;
  category: 'Success' | 'Study' | 'Business' | 'Coding' | 'Health' | 'Life';
  likes: number;
  createdAt: string;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  category: string;
  points: number;
  completedCount: number;
  targetDate: string;
  active: boolean;
}

export interface Comment {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}

export interface Photo {
  id: string;
  imageUrl: string;
  caption: string;
  smileScore: number;
  userName: string;
  tags: string[];
  likes: number;
  comments: Comment[];
  createdAt: string;
  fileName?: string;
  fileSize?: number;
  storagePath?: string;
  storageStatus?: string;
  uploadDate?: string;
}

export interface AIMotivation {
  paragraph: string;
  affirmation: string;
  dailyGoal: string;
  encouragement: string;
}

export interface AdminUser {
  email: string;
  role: string;
  name: string;
}

export interface DashboardStats {
  totalVisitors: number;
  activeSessions: number;
  totalPhotos: number;
  todayUploads: number;
  storageUsedMb: number;
  totalQuotes: number;
  dailyChallenges: number;
  aiRequestsCount: number;
  totalDownloads?: number;
  totalDeletions?: number;
  recentActivity?: ActivityLog[];
}

export interface ActivityLog {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export interface ChatMessage {
  id: string;
  senderSocketId: string;
  senderName: string;
  text?: string;
  image?: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'seen';
}

export interface ChatReport {
  id: string;
  roomId: string;
  reporterName: string;
  reportedName: string;
  reason: string;
  timestamp: string;
}

export interface ChatStats {
  usersOnline: number;
  waitingCount: number;
  activeChatsCount: number;
  totalChatSessions: number;
  avgChatDurationSec: number;
  imagesShared: number;
  reportsSubmitted: number;
  dailyChatCount: number;
  peakOnline: number;
}

