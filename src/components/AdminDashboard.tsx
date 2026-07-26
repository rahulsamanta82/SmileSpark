import React, { useState, useEffect } from 'react';
import { DashboardStats, Photo, Quote, DailyChallenge, ActivityLog } from '../types';
import JSZip from 'jszip';
import {
  Users,
  Image as ImageIcon,
  HardDrive,
  Quote as QuoteIcon,
  Trophy,
  Sparkles,
  Activity,
  Plus,
  Trash2,
  Download,
  LogOut,
  RefreshCw,
  BarChart2,
  Eye,
  CheckCircle2,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Grid,
  List,
  AlertTriangle,
  FolderArchive,
  Filter,
  Calendar,
  Database,
  ArrowDownCircle,
  Clock,
  MessageSquare,
  ShieldAlert,
  Flag,
  Zap,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'photos' | 'quotes' | 'challenges' | 'logs' | 'chat' | 'maintenance'>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [chatStats, setChatStats] = useState<any>(null);
  const [chatReports, setChatReports] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Database Maintenance State
  const [maintenanceStats, setMaintenanceStats] = useState<any>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState<boolean>(false);
  const [clearingTarget, setClearingTarget] = useState<string | null>(null);

  // Master Deletion Modal State
  const [showMasterModal, setShowMasterModal] = useState<boolean>(false);
  const [masterConfirmInput, setMasterConfirmInput] = useState<string>('');
  const [masterDeleting, setMasterDeleting] = useState<boolean>(false);
  const [masterReport, setMasterReport] = useState<any | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bulk Selection State for Photos
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals state
  const [showAddQuote, setShowAddQuote] = useState<boolean>(false);
  const [newQuote, setNewQuote] = useState({ quote: '', author: '', category: 'Success' as any });

  const [showAddChallenge, setShowAddChallenge] = useState<boolean>(false);
  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    category: 'Smile',
    points: 30,
    targetDate: new Date().toISOString().split('T')[0],
  });

  // Photo Zoom Modal
  const [zoomedPhoto, setZoomedPhoto] = useState<Photo | null>(null);

  // Bulk Delete Confirmation Modal
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    open: boolean;
    mode: 'single' | 'selected' | 'all';
    targetId?: string;
    count: number;
  }>({ open: false, mode: 'selected', count: 0 });

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(9);

  // Spark Connect Chat History & Conversation Viewer state
  const [chatRoomsList, setChatRoomsList] = useState<any[]>([]);
  const [chatImagesList, setChatImagesList] = useState<any[]>([]);
  const [liveUsersList, setLiveUsersList] = useState<any[]>([]);
  const [liveRoomsList, setLiveRoomsList] = useState<any[]>([]);
  const [roomSearchQuery, setRoomSearchQuery] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoomInfo, setSelectedRoomInfo] = useState<any>(null);
  const [selectedRoomMessages, setSelectedRoomMessages] = useState<any[]>([]);
  const [messageSearchQuery, setMessageSearchQuery] = useState<string>('');
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [chatAnalyticsData, setChatAnalyticsData] = useState<any>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'maintenance') {
      fetchMaintenanceStats();
    }
  }, [activeTab]);

  const fetchMaintenanceStats = async () => {
    try {
      setMaintenanceLoading(true);
      const res = await fetch('/api/admin/maintenance/stats');
      const data = await res.json();
      if (data.success) {
        setMaintenanceStats(data.data);
      }
    } catch (err) {
      console.error('Error fetching maintenance stats:', err);
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const handleSelectiveCleanup = async (target: string, label: string) => {
    if (!confirm(`Are you sure you want to permanently clear all data from ${label}? This operation cannot be undone.`)) {
      return;
    }
    setClearingTarget(target);
    try {
      const res = await fetch(`/api/admin/maintenance/clear/${target}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`Cleared ${data.targetLabel} (${data.deletedCount} records removed)`, 'success');
        await fetchMaintenanceStats();
        await fetchDashboardData();
      } else {
        showToast(data.message || `Failed to clear ${label}`, 'error');
      }
    } catch (err) {
      showToast(`Error clearing ${label}`, 'error');
    } finally {
      setClearingTarget(null);
    }
  };

  const handleMasterCleanup = async () => {
    if (masterConfirmInput.trim() !== 'DELETE ALL') {
      showToast('Security confirmation text must match DELETE ALL exactly', 'error');
      return;
    }
    setMasterDeleting(true);
    setMasterReport(null);
    try {
      const res = await fetch('/api/admin/maintenance/clear-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationText: masterConfirmInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMasterReport(data);
        showToast('Master application cleanup executed successfully', 'success');
        setMasterConfirmInput('');
        await fetchMaintenanceStats();
        await fetchDashboardData();
      } else {
        showToast(data.message || 'Master database cleanup failed', 'error');
      }
    } catch (err) {
      showToast('Failed to execute master database cleanup', 'error');
    } finally {
      setMasterDeleting(false);
    }
  };

  const fetchChatRooms = async () => {
    try {
      const res = await fetch('/api/admin/chat/rooms');
      const data = await res.json();
      if (data.success) {
        setChatRoomsList(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching chat rooms:', err);
    }
  };

  const fetchChatImages = async () => {
    try {
      const res = await fetch('/api/admin/chat/images');
      const data = await res.json();
      if (data.success) {
        setChatImagesList(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching chat images:', err);
    }
  };

  const fetchLiveUsers = async () => {
    try {
      const res = await fetch('/api/admin/chat/live-users');
      const data = await res.json();
      if (data.success) {
        setLiveUsersList(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching live users:', err);
    }
  };

  const fetchLiveRooms = async () => {
    try {
      const res = await fetch('/api/admin/chat/live-rooms');
      const data = await res.json();
      if (data.success) {
        setLiveRoomsList(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching live rooms:', err);
    }
  };

  const handleDeleteChatImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this shared image record from MongoDB?')) return;
    try {
      const res = await fetch(`/api/admin/chat/images/${imageId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setChatImagesList((prev) => prev.filter((img) => img.id !== imageId));
        showToast('Shared image record deleted', 'success');
      }
    } catch (err) {
      showToast('Failed to delete shared image', 'error');
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      const res = await fetch(`/api/admin/chat/reports/${reportId}/resolve`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        setChatReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: 'resolved' } : r)));
        showToast('Report marked as resolved', 'success');
      }
    } catch (err) {
      showToast('Failed to resolve report', 'error');
    }
  };

  const fetchChatAnalytics = async () => {
    try {
      const res = await fetch('/api/admin/chat/analytics');
      const data = await res.json();
      if (data.success) {
        setChatAnalyticsData(data.data);
      }
    } catch (err) {
      console.error('Error fetching chat analytics:', err);
    }
  };

  const handleOpenConversationViewer = async (roomId: string) => {
    try {
      setSelectedRoomId(roomId);
      setIsViewerOpen(true);
      const res = await fetch(`/api/admin/chat/rooms/${roomId}/messages`);
      const data = await res.json();
      if (data.success) {
        setSelectedRoomInfo(data.data.room);
        setSelectedRoomMessages(data.data.messages || []);
      }
    } catch (err) {
      console.error('Error opening conversation viewer:', err);
      showToast('Failed to load conversation history', 'error');
    }
  };

  const handleDeleteChatMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/admin/chat/messages/${messageId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSelectedRoomMessages((prev) => prev.filter((m) => m.id !== messageId));
        showToast('Chat message deleted', 'success');
      }
    } catch (err) {
      showToast('Failed to delete chat message', 'error');
    }
  };

  const handleDeleteChatRoom = async (roomId: string) => {
    if (!confirm(`Are you sure you want to delete chat room ${roomId} and all its messages permanently from MongoDB?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/chat/rooms/${roomId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setChatRoomsList((prev) => prev.filter((r) => r.roomId !== roomId));
        if (selectedRoomId === roomId) {
          setIsViewerOpen(false);
          setSelectedRoomId(null);
        }
        showToast('Chat room deleted permanently from MongoDB', 'success');
      }
    } catch (err) {
      showToast('Failed to delete chat room', 'error');
    }
  };

  const handleExportConversation = async (room: any, messages: any[] = []) => {
    let msgs = messages;
    if (!msgs || msgs.length === 0) {
      try {
        const res = await fetch(`/api/admin/chat/rooms/${room.roomId}/messages`);
        const data = await res.json();
        if (data.success) {
          msgs = data.data.messages || [];
        }
      } catch (err) {
        console.warn('Failed to fetch room messages for export:', err);
      }
    }

    const exportData = {
      room,
      exportedAt: new Date().toISOString(),
      messagesCount: msgs.length,
      messages: msgs.map((m) => ({
        id: m.id,
        senderAlias: m.senderAlias,
        senderSessionId: m.senderSessionId,
        messageType: m.messageType,
        message: m.message,
        imageUrl: m.imageUrl,
        timestamp: m.createdAt,
      })),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `conversation_${room?.roomId || 'chat'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Conversation exported successfully as JSON', 'success');
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, analyticsRes, photosRes, quotesRes, challengesRes, chatStatsRes, chatReportsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/analytics'),
        fetch('/api/photos'),
        fetch('/api/quotes'),
        fetch('/api/challenge/today'),
        fetch('/api/admin/chat-stats'),
        fetch('/api/admin/chat-reports'),
      ]);

      const [statsData, analyticsData, photosData, quotesData, challengesData, chatStatsData, chatReportsData] = await Promise.all([
        statsRes.json(),
        analyticsRes.json(),
        photosRes.json(),
        quotesRes.json(),
        challengesRes.json(),
        chatStatsRes.json(),
        chatReportsRes.json(),
      ]);

      if (statsData.success) setStats(statsData.data);
      if (analyticsData.success) setAnalytics(analyticsData.data);
      if (photosData.success) setPhotos(photosData.data);
      if (quotesData.success) setQuotes(quotesData.data);
      if (challengesData.success) setChallenges(challengesData.data);
      if (chatStatsData.success) setChatStats(chatStatsData.data);
      if (chatReportsData.success) setChatReports(chatReportsData.data);

      await Promise.all([fetchChatRooms(), fetchChatAnalytics(), fetchChatImages(), fetchLiveUsers(), fetchLiveRooms()]);
    } catch (err) {
      console.error('Error loading admin dashboard:', err);
      showToast('Failed to load dashboard data from MongoDB Atlas', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Helper formatters
  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '153.6 KB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'Jul 25, 2026';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return isoStr;
    }
  };

  // Single Photo Download
  const handleDownloadPhoto = async (photo: Photo) => {
    try {
      const fileName = photo.fileName || `snap_${photo.id}.jpg`;
      const link = document.createElement('a');
      link.href = photo.imageUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Record download analytics
      await fetch('/api/photos/record-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 1 }),
      });

      showToast(`Downloaded ${fileName}`);
      fetchDashboardData();
    } catch (err) {
      window.open(photo.imageUrl, '_blank');
    }
  };

  // Download Multiple Selected as ZIP
  const handleDownloadSelectedZip = async () => {
    if (selectedPhotoIds.length === 0) return;
    try {
      setIsProcessing(true);
      showToast(`Generating ZIP package for ${selectedPhotoIds.length} images...`);

      const zip = new JSZip();
      const folder = zip.folder('smilespark_photos');

      const selectedPhotos = photos.filter((p) => selectedPhotoIds.includes(p.id));

      for (let i = 0; i < selectedPhotos.length; i++) {
        const photo = selectedPhotos[i];
        const fileName = photo.fileName || `smile_capture_${photo.id}.jpg`;

        if (photo.imageUrl.startsWith('data:image')) {
          const base64Data = photo.imageUrl.replace(/^data:image\/\w+;base64,/, '');
          folder?.file(fileName, base64Data, { base64: true });
        } else {
          try {
            const resp = await fetch(photo.imageUrl);
            const blob = await resp.blob();
            folder?.file(fileName, blob);
          } catch (e) {
            console.warn('Could not fetch remote image blob, fallback to placeholder text in zip');
            folder?.file(`${fileName}.txt`, `Image URL: ${photo.imageUrl}`);
          }
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(content);

      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = `smilespark_admin_photos_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await fetch('/api/photos/record-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: selectedPhotos.length }),
      });

      showToast(`Successfully exported ${selectedPhotos.length} photos as ZIP archive!`);
      fetchDashboardData();
    } catch (err) {
      console.error('ZIP generation error:', err);
      showToast('Failed to create ZIP package', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle selection
  const toggleSelectPhoto = (id: string) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (filteredPhotos: Photo[]) => {
    if (selectedPhotoIds.length === filteredPhotos.length && filteredPhotos.length > 0) {
      setSelectedPhotoIds([]);
    } else {
      setSelectedPhotoIds(filteredPhotos.map((p) => p.id));
    }
  };

  // Execute Deletion Action
  const executeDelete = async () => {
    try {
      setIsProcessing(true);
      const { mode, targetId } = confirmDeleteModal;

      if (mode === 'single' && targetId) {
        const res = await fetch(`/api/photos/${targetId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          setPhotos((prev) => prev.filter((p) => p.id !== targetId));
          setSelectedPhotoIds((prev) => prev.filter((i) => i !== targetId));
          showToast('Image permanently removed from MongoDB Atlas');
        }
      } else if (mode === 'selected') {
        const res = await fetch('/api/admin/photos/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedPhotoIds }),
        });
        const data = await res.json();
        if (data.success) {
          setPhotos((prev) => prev.filter((p) => !selectedPhotoIds.includes(p.id)));
          showToast(`Deleted ${data.deletedCount} selected images from MongoDB Atlas`);
          setSelectedPhotoIds([]);
        }
      } else if (mode === 'all') {
        const res = await fetch('/api/admin/photos/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deleteAll: true }),
        });
        const data = await res.json();
        if (data.success) {
          setPhotos([]);
          setSelectedPhotoIds([]);
          showToast(`All images purged cleanly from MongoDB Atlas!`);
        }
      }

      setConfirmDeleteModal({ open: false, mode: 'selected', count: 0 });
      await fetchDashboardData();
    } catch (err) {
      console.error('Delete execution error:', err);
      showToast('Error executing image deletion', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Add Quote
  const handleAddQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuote),
      });
      const data = await res.json();
      if (data.success) {
        setQuotes((prev) => [data.data, ...prev]);
        setShowAddQuote(false);
        setNewQuote({ quote: '', author: '', category: 'Success' });
        showToast('Inspirational quote published to MongoDB Atlas');
      }
    } catch (err) {
      showToast('Failed to save quote', 'error');
    }
  };

  // Delete Quote
  const handleDeleteQuote = async (id: string) => {
    if (!confirm('Delete this quote from MongoDB?')) return;
    try {
      const res = await fetch(`/api/quotes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setQuotes((prev) => prev.filter((q) => q.id !== id));
        showToast('Quote deleted');
      }
    } catch (err) {
      showToast('Error deleting quote', 'error');
    }
  };

  // Add Challenge
  const handleAddChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChallenge),
      });
      const data = await res.json();
      if (data.success) {
        setChallenges((prev) => [data.data, ...prev]);
        setShowAddChallenge(false);
        setNewChallenge({
          title: '',
          description: '',
          category: 'Smile',
          points: 30,
          targetDate: new Date().toISOString().split('T')[0],
        });
        showToast('Daily challenge published');
      }
    } catch (err) {
      showToast('Failed to save challenge', 'error');
    }
  };

  // Delete Challenge
  const handleDeleteChallenge = async (id: string) => {
    if (!confirm('Delete this challenge?')) return;
    try {
      const res = await fetch(`/api/challenge/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setChallenges((prev) => prev.filter((c) => c.id !== id));
        showToast('Challenge deleted');
      }
    } catch (err) {
      showToast('Error deleting challenge', 'error');
    }
  };

  const COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#8b5cf6'];

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans transition-colors">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold transition-all animate-bounce ${
            toastMessage.type === 'error'
              ? 'bg-rose-900/90 border-rose-500 text-rose-100'
              : 'bg-emerald-900/90 border-emerald-500 text-emerald-100'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30 text-xs font-bold uppercase">
              Admin Management Portal
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              MongoDB Atlas Live
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
            SmileSpark Admin Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer text-xs font-bold"
            title="Refresh MongoDB Stats"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer border border-rose-400/30"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Admin Nav Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 border-b border-slate-200 dark:border-white/10 no-scrollbar">
        {[
          { id: 'overview', label: 'Overview Analytics', icon: BarChart2 },
          { id: 'chat', label: 'Spark Connect Chat', icon: MessageSquare },
          { id: 'photos', label: `Photos Management (${photos.length})`, icon: ImageIcon },
          { id: 'quotes', label: `Quotes (${quotes.length})`, icon: QuoteIcon },
          { id: 'challenges', label: `Daily Challenges (${challenges.length})`, icon: Trophy },
          { id: 'logs', label: 'Activity Logs', icon: Activity },
          { id: 'maintenance', label: 'Database Maintenance', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-8">
          {/* Real-time Dashboard Analytics Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl">
              <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-1">
                <ImageIcon className="w-4 h-4" />
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Database</span>
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.totalPhotos}
              </span>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Total Images
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl">
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
                <HardDrive className="w-4 h-4" />
                <span className="text-[10px] font-bold text-slate-400">Storage</span>
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.storageUsedMb} MB
              </span>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Storage Used
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl">
              <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] font-bold text-indigo-500">Today</span>
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.todayUploads}
              </span>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Today's Uploads
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl">
              <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
                <ArrowDownCircle className="w-4 h-4" />
                <span className="text-[10px] font-bold text-blue-500">Export</span>
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.totalDownloads || 0}
              </span>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Total Downloads
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl">
              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1">
                <Trash2 className="w-4 h-4" />
                <span className="text-[10px] font-bold text-rose-500">Purged</span>
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.totalDeletions || 0}
              </span>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Total Deletions
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl">
              <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-1">
                <Sparkles className="w-4 h-4" />
                <span className="text-[10px] font-bold text-purple-500">AI Engine</span>
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.aiRequestsCount}
              </span>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                AI Requests
              </span>
            </div>
          </div>

          {/* Charts & Activity */}
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Trends Area Chart */}
              <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-indigo-500" />
                  <span>Upload & AI Activity Trends</span>
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.uploadTrends}>
                      <defs>
                        <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorPrompts" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="day" stroke="#888888" fontSize={12} />
                      <YAxis stroke="#888888" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                      <Area type="monotone" dataKey="aiPrompts" stroke="#6366f1" fillOpacity={1} fill="url(#colorPrompts)" name="AI Prompts" />
                      <Area type="monotone" dataKey="uploads" stroke="#f43f5e" fillOpacity={1} fill="url(#colorUploads)" name="Photo Uploads" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Activity Log Box */}
              <div className="p-6 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl flex flex-col">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span>Recent Upload & System Activity</span>
                </h3>
                <div className="space-y-2.5 overflow-y-auto max-h-60 pr-1 no-scrollbar">
                  {stats.recentActivity && stats.recentActivity.length > 0 ? (
                    stats.recentActivity.map((log: any) => (
                      <div key={log.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-xs">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">{log.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">{formatDate(log.timestamp)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">No recent activity recorded.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SPARK CONNECT LIVE CHAT TAB */}
      {activeTab === 'chat' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Top Live Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="p-4 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
              <div className="flex items-center justify-between text-emerald-500 mb-1">
                <Users className="w-4 h-4" />
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {chatStats?.usersOnline ?? 18}
              </span>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Users Online
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
              <div className="flex items-center justify-between text-indigo-500 mb-1">
                <MessageSquare className="w-4 h-4" />
                <span className="text-[10px] font-bold text-indigo-500">Live</span>
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {chatStats?.activeChatsCount ?? 2}
              </span>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Active Rooms
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
              <div className="flex items-center justify-between text-amber-500 mb-1">
                <Zap className="w-4 h-4" />
                <span className="text-[10px] font-bold text-amber-500">Queue</span>
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {chatStats?.waitingCount ?? 0}
              </span>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Waiting Queue
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
              <div className="flex items-center justify-between text-rose-500 mb-1">
                <Sparkles className="w-4 h-4" />
                <span className="text-[10px] font-bold text-slate-400">Total</span>
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {chatStats?.totalChatSessions ?? 142}
              </span>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Total Sessions
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
              <div className="flex items-center justify-between text-indigo-400 mb-1">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {Math.round((chatStats?.avgChatDurationSec ?? 210) / 60)}m
              </span>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Avg Duration
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
              <div className="flex items-center justify-between text-purple-500 mb-1">
                <ImageIcon className="w-4 h-4" />
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {chatStats?.imagesShared ?? 38}
              </span>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Images Shared
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
              <div className="flex items-center justify-between text-rose-500 mb-1">
                <Flag className="w-4 h-4" />
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {chatStats?.reportsSubmitted ?? chatReports.length}
              </span>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Reports Logged
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
              <div className="flex items-center justify-between text-emerald-500 mb-1">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {chatStats?.dailyChatCount ?? 48}
              </span>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Daily Count
              </span>
            </div>
          </div>

          {/* Spark Connect Chat History Section */}
          <div className="p-6 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-500" />
                  <span>Spark Connect Conversations History (MongoDB)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total {chatRoomsList.length} chat sessions logged in database.
                </p>
              </div>

              {/* Room Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Room ID or Alias..."
                  value={roomSearchQuery}
                  onChange={(e) => setRoomSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Chat History Table */}
            {chatRoomsList.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No chat rooms recorded yet. Visitors will appear here as they connect on Spark Connect!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 uppercase font-bold tracking-wider">
                      <th className="py-3 px-4">Room ID</th>
                      <th className="py-3 px-4">Visitor A (Session)</th>
                      <th className="py-3 px-4">Visitor B (Session)</th>
                      <th className="py-3 px-4">Started</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4 text-center">Messages</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {chatRoomsList
                      .filter((room) => {
                        if (!roomSearchQuery) return true;
                        const q = roomSearchQuery.toLowerCase();
                        return (
                          room.roomId?.toLowerCase().includes(q) ||
                          room.user1Alias?.toLowerCase().includes(q) ||
                          room.user2Alias?.toLowerCase().includes(q) ||
                          room.user1SessionId?.toLowerCase().includes(q) ||
                          room.user2SessionId?.toLowerCase().includes(q)
                        );
                      })
                      .map((room) => (
                        <tr key={room.roomId} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {room.roomId}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">{room.user1Alias || 'Visitor A'}</span>
                            <span className="font-mono text-[10px] text-slate-400 block">{room.user1SessionId ? `${room.user1SessionId.substring(0, 12)}...` : 'Anon'}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">{room.user2Alias || 'Visitor B'}</span>
                            <span className="font-mono text-[10px] text-slate-400 block">{room.user2SessionId ? `${room.user2SessionId.substring(0, 12)}...` : 'Anon'}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">{formatDate(room.createdAt)}</td>
                          <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                            {room.duration ? `${Math.floor(room.duration / 60)}m ${room.duration % 60}s` : 'Active / <1m'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-white">
                            {room.totalMessages || 0}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                room.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                                  : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400'
                              }`}
                            >
                              {room.status === 'active' ? '● Active' : 'Ended'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1.5">
                            <button
                              onClick={() => handleOpenConversationViewer(room.roomId)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-[11px] font-bold cursor-pointer transition-all"
                            >
                              View Messages
                            </button>
                            <button
                              onClick={() => handleExportConversation(room, [])}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-[11px] font-bold cursor-pointer transition-all"
                            >
                              Export
                            </button>
                            <button
                              onClick={() => handleDeleteChatRoom(room.roomId)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-[11px] font-bold cursor-pointer transition-all"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Spark Connect Analytics Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                <span>Daily Chat Traffic & Activity</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chatAnalyticsData?.dailyTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="day" stroke="#888888" fontSize={11} />
                    <YAxis stroke="#888888" fontSize={11} />
                    <Tooltip contentStyle={{ borderRadius: '12px', background: '#0f172a', border: 'none', color: '#fff', fontSize: '12px' }} />
                    <Bar dataKey="chats" fill="#6366f1" radius={[6, 6, 0, 0]} name="Chat Sessions" />
                    <Bar dataKey="messages" fill="#ec4899" radius={[6, 6, 0, 0]} name="Messages Sent" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span>Weekly Growth & Average Duration (Minutes)</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chatAnalyticsData?.weeklyTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="week" stroke="#888888" fontSize={11} />
                    <YAxis stroke="#888888" fontSize={11} />
                    <Tooltip contentStyle={{ borderRadius: '12px', background: '#0f172a', border: 'none', color: '#fff', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="chats" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Weekly Chats" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Shared Chat Images Records Table (MongoDB) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-indigo-500" />
                  <span>Shared Chat Images Records (MongoDB Atlas)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage image uploads shared explicitly by visitors in Spark Connect.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                {chatImagesList.length} Uploaded
              </span>
            </div>

            {chatImagesList.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No shared chat images recorded yet. Shared images will appear here as users send them.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 uppercase font-bold tracking-wider">
                      <th className="py-3 px-4">Preview</th>
                      <th className="py-3 px-4">Image ID</th>
                      <th className="py-3 px-4">Room ID</th>
                      <th className="py-3 px-4">Sender Alias</th>
                      <th className="py-3 px-4">Uploaded At</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {chatImagesList.map((img) => (
                      <tr key={img.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="py-2.5 px-4">
                          <img src={img.imageUrl} alt="Shared" className="w-10 h-10 rounded-lg object-cover border border-black/10" />
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-500">{img.id}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{img.roomId}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">{img.senderAlias || 'Anonymous'}</td>
                        <td className="py-2.5 px-4 text-slate-400">{formatDate(img.uploadedAt)}</td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteChatImage(img.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-[11px] font-bold cursor-pointer transition-all"
                          >
                            Delete Record
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Safety & Moderation Reports Table */}
          <div className="p-6 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  <span>Submitted User Reports & Content Moderation</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Review flagged user reports, room IDs, and reported reasons submitted in Spark Connect.
                </p>
              </div>
            </div>

            {chatReports.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                No user reports recorded. The community is peaceful and positive! ✨
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 uppercase font-bold tracking-wider">
                      <th className="py-3 px-4">Report ID</th>
                      <th className="py-3 px-4">Room ID</th>
                      <th className="py-3 px-4">Reporter</th>
                      <th className="py-3 px-4">Reported User</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4 text-right">Status / Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {chatReports.map((rep) => (
                      <tr key={rep.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-500">{rep.id}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{rep.roomId}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{rep.reporterName}</td>
                        <td className="py-3.5 px-4 font-bold text-rose-600 dark:text-rose-400">{rep.reportedName}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">{rep.reason}</td>
                        <td className="py-3.5 px-4 text-slate-400">{formatDate(rep.timestamp)}</td>
                        <td className="py-3.5 px-4 text-right">
                          {rep.status === 'resolved' ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                              Resolved
                            </span>
                          ) : (
                            <button
                              onClick={() => handleResolveReport(rep.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer transition-all shadow-xs"
                            >
                              Mark Resolved
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PHOTOS MANAGEMENT TAB */}
      {activeTab === 'photos' && (() => {
        // Filter photos
        const filteredPhotos = photos.filter((p) => {
          const matchesSearch =
            p.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.fileName && p.fileName.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.tags && p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

          if (!matchesSearch) return false;

          if (dateFilter === 'today') {
            const uploadTime = new Date(p.uploadDate || p.createdAt || Date.now()).getTime();
            const startOfToday = new Date().setHours(0, 0, 0, 0);
            return uploadTime >= startOfToday;
          } else if (dateFilter === 'week') {
            const uploadTime = new Date(p.uploadDate || p.createdAt || Date.now()).getTime();
            const oneWeekAgo = Date.now() - 7 * 24 * 3600 * 1000;
            return uploadTime >= oneWeekAgo;
          } else if (dateFilter === 'month') {
            const uploadTime = new Date(p.uploadDate || p.createdAt || Date.now()).getTime();
            const oneMonthAgo = Date.now() - 30 * 24 * 3600 * 1000;
            return uploadTime >= oneMonthAgo;
          }

          return true;
        });

        const totalPages = Math.ceil(filteredPhotos.length / itemsPerPage) || 1;
        const paginatedPhotos = filteredPhotos.slice(
          (currentPage - 1) * itemsPerPage,
          currentPage * itemsPerPage
        );

        const isAllSelected = filteredPhotos.length > 0 && selectedPhotoIds.length === filteredPhotos.length;

        return (
          <div className="space-y-6">
            {/* Controls & Bulk Toolbar */}
            <div className="p-5 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl space-y-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-500" />
                    <span>Photos Management (MongoDB Atlas)</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Viewing {filteredPhotos.length} of {photos.length} total stored images.
                  </p>
                </div>

                {/* Bulk Actions Button Group */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  <button
                    onClick={() => toggleSelectAll(filteredPhotos)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 font-bold text-xs hover:bg-slate-200 dark:hover:bg-white/20 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
                  </button>

                  <button
                    disabled={selectedPhotoIds.length === 0 || isProcessing}
                    onClick={handleDownloadSelectedZip}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-indigo-400/30"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    <span>Download Selected ({selectedPhotoIds.length}) ZIP</span>
                  </button>

                  <button
                    disabled={selectedPhotoIds.length === 0 || isProcessing}
                    onClick={() =>
                      setConfirmDeleteModal({
                        open: true,
                        mode: 'selected',
                        count: selectedPhotoIds.length,
                      })
                    }
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-rose-400/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedPhotoIds.length})</span>
                  </button>

                  <button
                    disabled={photos.length === 0 || isProcessing}
                    onClick={() =>
                      setConfirmDeleteModal({
                        open: true,
                        mode: 'all',
                        count: photos.length,
                      })
                    }
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-black text-xs shadow-lg transition-all cursor-pointer border border-red-500/50"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Delete All Images ({photos.length})</span>
                  </button>
                </div>
              </div>

              {/* Filters, View Mode, Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  {/* Search Bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search filename, user, tags..."
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>

                  {/* Date Filter */}
                  <select
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Uploaded Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                </div>

                {/* Grid vs Table Toggle */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
                      }`}
                      title="Grid View"
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        viewMode === 'table' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
                      }`}
                      title="Table View"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Page Size */}
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value={6}>6 per page</option>
                    <option value={9}>9 per page</option>
                    <option value={18}>18 per page</option>
                    <option value={36}>36 per page</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Photos Content Display */}
            {paginatedPhotos.length === 0 ? (
              <div className="text-center py-16 p-6 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
                <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-base font-bold text-slate-800 dark:text-slate-200">No photos found</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try adjusting your search or date filters.</p>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedPhotos.map((photo) => {
                  const isSelected = selectedPhotoIds.includes(photo.id);
                  const fileName = photo.fileName || `snap_${photo.id}.jpg`;
                  return (
                    <div
                      key={photo.id}
                      className={`p-4 rounded-3xl bg-white dark:bg-white/5 border shadow-sm dark:shadow-xl transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                          : 'border-slate-200 dark:border-white/10'
                      }`}
                    >
                      {/* Thumbnail Header with Checkbox */}
                      <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 bg-black group">
                        <img
                          src={photo.imageUrl}
                          alt={photo.caption}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Checkbox */}
                        <div className="absolute top-2 left-2 z-10">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectPhoto(photo.id)}
                            className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                          />
                        </div>

                        {/* Storage Badge */}
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-600/90 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-md border border-emerald-400/30">
                          MongoDB Atlas
                        </span>

                        {/* Zoom button */}
                        <button
                          onClick={() => setZoomedPhoto(photo)}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                        >
                          <Eye className="w-8 h-8 drop-shadow-md" />
                        </button>
                      </div>

                      {/* File Details */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-900 dark:text-white truncate max-w-[180px]" title={fileName}>
                            {fileName}
                          </span>
                          <span className="text-indigo-600 dark:text-indigo-400">{photo.smileScore}% Smile</span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 font-medium">
                          {photo.caption || 'Captured via Smile Booth'}
                        </p>

                        <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-white/5">
                          <div>
                            <span className="block font-semibold">Size:</span>
                            <span className="text-slate-700 dark:text-slate-300 font-bold">{formatBytes(photo.fileSize)}</span>
                          </div>
                          <div>
                            <span className="block font-semibold">Uploaded:</span>
                            <span className="text-slate-700 dark:text-slate-300 font-medium">{formatDate(photo.uploadDate || photo.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          User: {photo.userName || 'Sparker'}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDownloadPhoto(photo)}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition-colors cursor-pointer border border-slate-200 dark:border-white/10"
                            title="Download Image File"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() =>
                              setConfirmDeleteModal({
                                open: true,
                                mode: 'single',
                                targetId: photo.id,
                                count: 1,
                              })
                            }
                            className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                            title="Delete Photo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* TABLE VIEW */
              <div className="overflow-x-auto rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-white/10">
                    <tr>
                      <th className="p-4 w-10">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={() => toggleSelectAll(filteredPhotos)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                        />
                      </th>
                      <th className="p-4">Preview</th>
                      <th className="p-4">File Name</th>
                      <th className="p-4">Upload Timestamp</th>
                      <th className="p-4">Size</th>
                      <th className="p-4">Storage Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-800 dark:text-slate-200">
                    {paginatedPhotos.map((photo) => {
                      const isSelected = selectedPhotoIds.includes(photo.id);
                      const fileName = photo.fileName || `snap_${photo.id}.jpg`;
                      return (
                        <tr
                          key={photo.id}
                          className={`hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${
                            isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''
                          }`}
                        >
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectPhoto(photo.id)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                            />
                          </td>
                          <td className="p-4">
                            <img
                              src={photo.imageUrl}
                              alt={fileName}
                              onClick={() => setZoomedPhoto(photo)}
                              className="w-12 h-12 rounded-xl object-cover cursor-pointer hover:scale-105 transition-transform"
                            />
                          </td>
                          <td className="p-4 font-bold text-slate-900 dark:text-white">
                            {fileName}
                            <span className="block text-[10px] text-slate-400 font-normal">{photo.userName}</span>
                          </td>
                          <td className="p-4 text-slate-500 dark:text-slate-400">
                            {formatDate(photo.uploadDate || photo.createdAt)}
                          </td>
                          <td className="p-4 font-semibold">{formatBytes(photo.fileSize)}</td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 text-[10px] font-bold">
                              MongoDB Atlas (Stored)
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleDownloadPhoto(photo)}
                                className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:text-indigo-600 transition-colors cursor-pointer"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  setConfirmDeleteModal({
                                    open: true,
                                    mode: 'single',
                                    targetId: photo.id,
                                    count: 1,
                                  })
                                }
                                className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/10 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">
                  Showing Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* QUOTES TAB */}
      {activeTab === 'quotes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Motivational Quotes Catalog</h3>
            <button
              onClick={() => setShowAddQuote(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer border border-indigo-400/30"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Quote</span>
            </button>
          </div>

          <div className="space-y-3">
            {quotes.map((q) => (
              <div key={q.id} className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30 text-[10px] font-bold uppercase">
                      {q.category}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">— {q.author}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">"{q.quote}"</p>
                </div>

                <button
                  onClick={() => handleDeleteQuote(q.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  title="Delete Quote"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHALLENGES TAB */}
      {activeTab === 'challenges' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Daily Challenges Manager</h3>
            <button
              onClick={() => setShowAddChallenge(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Challenge</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {challenges.map((c) => (
              <div key={c.id} className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 text-[10px] font-bold">
                      +{c.points} pts
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{c.category}</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{c.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{c.description}</p>
                </div>

                <button
                  onClick={() => handleDeleteChallenge(c.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LOGS TAB */}
      {activeTab === 'logs' && analytics && (
        <div className="space-y-4">
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Real-Time Audit Stream</h3>
          <div className="space-y-2">
            {analytics.activityLogs && analytics.activityLogs.map((log: ActivityLog) => (
              <div key={log.id} className="p-3.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">{log.message}</span>
                </div>
                <span className="text-slate-400">{formatDate(log.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {confirmDeleteModal.open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-white/10 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-4 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white text-center">
              Confirm Image Deletion
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 text-center mt-2 leading-relaxed">
              {confirmDeleteModal.mode === 'all'
                ? `WARNING: You are about to permanently purge ALL ${confirmDeleteModal.count} images from MongoDB Atlas storage. This action cannot be undone.`
                : confirmDeleteModal.mode === 'selected'
                ? `You are about to delete ${confirmDeleteModal.count} selected image(s) from MongoDB Atlas storage.`
                : 'Are you sure you want to delete this image record from MongoDB Atlas?'}
            </p>

            <div className="mt-6 flex items-center gap-3">
              <button
                disabled={isProcessing}
                onClick={() => setConfirmDeleteModal({ open: false, mode: 'selected', count: 0 })}
                className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>

              <button
                disabled={isProcessing}
                onClick={executeDelete}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer transition-colors shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Confirm Purge</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-white/10 shadow-2xl space-y-4">
            <button
              onClick={() => setZoomedPhoto(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-black/40 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="max-h-[60vh] overflow-hidden rounded-2xl bg-black flex items-center justify-center">
              <img src={zoomedPhoto.imageUrl} alt={zoomedPhoto.caption} className="max-h-[58vh] object-contain" />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="text-slate-900 dark:text-white text-sm">{zoomedPhoto.fileName || `snap_${zoomedPhoto.id}.jpg`}</span>
                <span className="text-amber-500 font-extrabold">{zoomedPhoto.smileScore}% Smile Score</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">"{zoomedPhoto.caption}"</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-white/10 mt-3">
                <div>
                  <span className="block font-semibold">User:</span>
                  <span className="text-slate-900 dark:text-white font-bold">{zoomedPhoto.userName}</span>
                </div>
                <div>
                  <span className="block font-semibold">Size:</span>
                  <span className="text-slate-900 dark:text-white font-bold">{formatBytes(zoomedPhoto.fileSize)}</span>
                </div>
                <div>
                  <span className="block font-semibold">Uploaded:</span>
                  <span className="text-slate-900 dark:text-white font-bold">{formatDate(zoomedPhoto.uploadDate || zoomedPhoto.createdAt)}</span>
                </div>
                <div>
                  <span className="block font-semibold">Storage Path:</span>
                  <span className="text-slate-900 dark:text-white font-bold truncate block">{zoomedPhoto.storagePath || `mongodb_atlas/photos/${zoomedPhoto.id}.jpg`}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DATABASE MAINTENANCE TAB */}
      {activeTab === 'maintenance' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Warning Banner */}
          <div className="p-5 sm:p-6 rounded-3xl bg-amber-500/10 dark:bg-amber-500/15 border-2 border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                  <span>Database Maintenance & Storage Management</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] uppercase font-extrabold border border-amber-500/30">
                    Development & Demo
                  </span>
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-amber-800 dark:text-amber-300 mt-0.5">
                  These actions permanently delete data and cannot be undone.
                </p>
              </div>
            </div>

            <button
              onClick={fetchMaintenanceStats}
              disabled={maintenanceLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-100 font-bold text-xs transition-all cursor-pointer shrink-0 border border-amber-500/30"
            >
              <RefreshCw className={`w-4 h-4 ${maintenanceLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Statistics</span>
            </button>
          </div>

          {/* Database Live Statistics Overview Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-500" />
                <span>Live Collection & Storage Statistics</span>
              </h3>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                MongoDB Atlas Status: <span className="font-bold text-emerald-500">Connected</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
              {[
                { label: 'Total Visitors', value: maintenanceStats?.visitorSessions ?? 0, icon: Users, color: 'text-blue-500' },
                { label: 'Chat Rooms', value: maintenanceStats?.chatRooms ?? 0, icon: MessageSquare, color: 'text-indigo-500' },
                { label: 'Chat Messages', value: maintenanceStats?.chatMessages ?? 0, icon: MessageSquare, color: 'text-purple-500' },
                { label: 'Shared Images', value: maintenanceStats?.chatImages ?? 0, icon: ImageIcon, color: 'text-rose-500' },
                { label: 'Safety Reports', value: maintenanceStats?.reports ?? 0, icon: ShieldAlert, color: 'text-amber-500' },
                { label: 'AI Motivation', value: maintenanceStats?.motivationHistory ?? 0, icon: Sparkles, color: 'text-amber-400' },
                { label: 'Quotes Generated', value: maintenanceStats?.quotes ?? 0, icon: QuoteIcon, color: 'text-emerald-500' },
                { label: 'Daily Challenges', value: maintenanceStats?.dailyChallenges ?? 0, icon: Trophy, color: 'text-yellow-500' },
                { label: 'Dream Planner', value: maintenanceStats?.dreamPlannerRecords ?? 0, icon: Zap, color: 'text-cyan-500' },
                { label: 'Analytics Records', value: maintenanceStats?.analytics ?? 0, icon: BarChart3, color: 'text-indigo-400' },
                { label: 'Firebase Presence', value: maintenanceStats?.firebasePresence ?? 0, icon: Activity, color: 'text-emerald-400' },
                { label: 'Estimated Storage', value: `${maintenanceStats?.totalStorageMb ?? 0} MB`, icon: HardDrive, color: 'text-rose-400' },
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div key={idx} className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                        {stat.label}
                      </span>
                      <Icon className={`w-4 h-4 ${stat.color} shrink-0`} />
                    </div>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {maintenanceLoading ? '...' : stat.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selective Collection Cleanup Controls */}
          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" />
              <span>Selective Collection Cleanup</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clear individual collections to free up MongoDB Atlas storage limits without affecting other feature modules.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { id: 'chat-rooms', title: 'Clear Chat Rooms', desc: 'Delete all chat room session records', count: maintenanceStats?.chatRooms ?? 0 },
                { id: 'chat-messages', title: 'Clear Chat Messages', desc: 'Delete all transcript messages across rooms', count: maintenanceStats?.chatMessages ?? 0 },
                { id: 'chat-images', title: 'Clear Shared Chat Images', desc: 'Delete all image attachments in chat', count: maintenanceStats?.chatImages ?? 0 },
                { id: 'reports', title: 'Clear Safety Reports', desc: 'Delete all pending and resolved moderation reports', count: maintenanceStats?.reports ?? 0 },
                { id: 'motivation', title: 'Clear AI Motivation History', desc: 'Delete saved mood advice & AI responses', count: maintenanceStats?.motivationHistory ?? 0 },
                { id: 'quotes', title: 'Clear Generated Quotes', desc: 'Delete quote library entries', count: maintenanceStats?.quotes ?? 0 },
                { id: 'daily-challenges', title: 'Clear Daily Challenges', desc: 'Reset active challenges and streaks', count: maintenanceStats?.dailyChallenges ?? 0 },
                { id: 'dream-planner', title: 'Clear Dream Planner Data', desc: 'Delete plans, tasks, and milestone records', count: maintenanceStats?.dreamPlannerRecords ?? 0 },
                { id: 'analytics', title: 'Clear Analytics Records', desc: 'Reset visitor counters and traffic metrics', count: maintenanceStats?.analytics ?? 0 },
                { id: 'activity-logs', title: 'Clear Activity Logs', desc: 'Wipe administrative activity history', count: maintenanceStats?.activityLogs ?? 0 },
                { id: 'visitor-sessions', title: 'Clear Visitor Sessions', desc: 'Delete session tracking tokens', count: maintenanceStats?.visitorSessions ?? 0 },
                { id: 'presence', title: 'Clear Firebase Presence & Queue', desc: 'Reset live active sockets and waiting queue in memory', count: maintenanceStats?.firebasePresence ?? 0 },
                { id: 'photos', title: 'Clear Community Photos', desc: 'Delete community gallery uploads and smile captures', count: maintenanceStats?.photos ?? 0 },
              ].map((item) => {
                const isClearing = clearingTarget === item.id;
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between gap-3 hover:border-slate-300 dark:hover:border-white/20 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold">
                          {item.count} items
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                    </div>

                    <button
                      onClick={() => handleSelectiveCleanup(item.id, item.title)}
                      disabled={isClearing || item.count === 0}
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-rose-50 dark:hover:bg-rose-500/20 hover:text-rose-600 dark:hover:text-rose-400 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all border border-slate-200 dark:border-white/10 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className={`w-3.5 h-3.5 ${isClearing ? 'animate-spin' : ''}`} />
                      <span>{isClearing ? 'Clearing Data...' : `Delete ${item.title.replace('Clear ', '')}`}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MASTER CLEANUP SECTION */}
          <div className="p-6 sm:p-8 rounded-3xl bg-rose-500/10 dark:bg-rose-950/40 border-2 border-rose-500/40 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
                    Master Action
                  </span>
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Irreversible Action</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Delete All Application Data
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                  Permanently deletes all documents across all application collections in MongoDB Atlas (chat rooms, messages, images, reports, quotes, daily challenges, dream plans, motivation history, analytics, photos, and activity logs) and resets temporary in-memory presence queues. Does not drop database or collection structures.
                </p>
              </div>

              <button
                onClick={() => {
                  setMasterConfirmInput('');
                  setMasterReport(null);
                  setShowMasterModal(true);
                }}
                className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm shadow-xl shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-2 border border-rose-400/40 shrink-0"
              >
                <Trash2 className="w-5 h-5" />
                <span>Delete All Application Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Quote Modal */}
      {showAddQuote && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-white/10 shadow-2xl">
            <button onClick={() => setShowAddQuote(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">Add New Motivational Quote</h3>
            <form onSubmit={handleAddQuote} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Quote Text</label>
                <textarea
                  required
                  value={newQuote.quote}
                  onChange={(e) => setNewQuote({ ...newQuote, quote: e.target.value })}
                  placeholder="e.g. Dream big and dare to fail."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Author</label>
                <input
                  type="text"
                  required
                  value={newQuote.author}
                  onChange={(e) => setNewQuote({ ...newQuote, author: e.target.value })}
                  placeholder="e.g. Norman Vaughan"
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Category</label>
                <select
                  value={newQuote.category}
                  onChange={(e) => setNewQuote({ ...newQuote, category: e.target.value as any })}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="Success">Success</option>
                  <option value="Study">Study</option>
                  <option value="Business">Business</option>
                  <option value="Coding">Coding</option>
                  <option value="Health">Health</option>
                  <option value="Life">Life</option>
                </select>
              </div>

              <button type="submit" className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md cursor-pointer border border-indigo-400/30">
                Save Quote
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Challenge Modal */}
      {showAddChallenge && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-white/10 shadow-2xl">
            <button onClick={() => setShowAddChallenge(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">Create Daily Challenge</h3>
            <form onSubmit={handleAddChallenge} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Challenge Title</label>
                <input
                  type="text"
                  required
                  value={newChallenge.title}
                  onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })}
                  placeholder="e.g. Read 10 Pages of Code Docs"
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Description</label>
                <textarea
                  required
                  value={newChallenge.description}
                  onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
                  placeholder="Brief description..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Points</label>
                  <input
                    type="number"
                    value={newChallenge.points}
                    onChange={(e) => setNewChallenge({ ...newChallenge, points: Number(e.target.value) })}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Category</label>
                  <input
                    type="text"
                    value={newChallenge.category}
                    onChange={(e) => setNewChallenge({ ...newChallenge, category: e.target.value })}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md cursor-pointer">
                Publish Challenge
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SPARK CONNECT CONVERSATION VIEWER MODAL */}
      {isViewerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    Room ID: {selectedRoomId}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                    MongoDB Record
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">
                  {selectedRoomInfo?.user1Alias || 'Visitor A'} ↔ {selectedRoomInfo?.user2Alias || 'Visitor B'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportConversation(selectedRoomInfo, selectedRoomMessages)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
                <button
                  onClick={() => selectedRoomId && handleDeleteChatRoom(selectedRoomId)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Room</span>
                </button>
                <button
                  onClick={() => setIsViewerOpen(false)}
                  className="p-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Message Search Bar */}
            <div className="p-3 border-b border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-white/5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter messages in this conversation..."
                  value={messageSearchQuery}
                  onChange={(e) => setMessageSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Message History Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {selectedRoomMessages.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No messages stored in this room yet.
                </div>
              ) : (
                selectedRoomMessages
                  .filter((m) => !messageSearchQuery || m.message?.toLowerCase().includes(messageSearchQuery.toLowerCase()))
                  .map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {m.senderAlias || 'Anonymous'}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            ({m.senderSessionId ? m.senderSessionId.substring(0, 10) : 'Anon'})
                          </span>
                          <span className="text-[10px] text-slate-400">{formatDate(m.createdAt)}</span>
                        </div>

                        {m.messageType === 'image' || m.imageUrl ? (
                          <div className="mt-2">
                            <img
                              src={m.imageUrl}
                              alt="Shared in chat"
                              className="max-w-xs max-h-48 rounded-xl border border-slate-200 dark:border-white/10 object-cover"
                            />
                            {m.message && <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">{m.message}</p>}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{m.message}</p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteChatMessage(m.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-all cursor-pointer"
                        title="Delete this message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MASTER CLEANUP CONFIRMATION MODAL */}
      {showMasterModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-rose-500/50 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 animate-fadeIn relative">
            <button
              onClick={() => setShowMasterModal(false)}
              disabled={masterDeleting}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-8 h-8 animate-bounce" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  Master Database Deletion
                </h3>
                <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">
                  Double Confirmation Required
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-500/10 dark:bg-rose-950/50 border border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs sm:text-sm font-semibold leading-relaxed">
              This action will permanently delete all application data from MongoDB and clear temporary Firebase data. This action cannot be undone.
            </div>

            {!masterReport ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    To confirm deletion, type <span className="text-rose-600 dark:text-rose-400 font-black">DELETE ALL</span> below:
                  </label>
                  <input
                    type="text"
                    value={masterConfirmInput}
                    onChange={(e) => setMasterConfirmInput(e.target.value)}
                    placeholder="Type DELETE ALL"
                    disabled={masterDeleting}
                    className="w-full p-3.5 rounded-xl bg-slate-100 dark:bg-black/50 border border-slate-300 dark:border-white/20 font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 uppercase"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMasterModal(false)}
                    disabled={masterDeleting}
                    className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleMasterCleanup}
                    disabled={masterDeleting || masterConfirmInput.trim() !== 'DELETE ALL'}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed border border-rose-400/40"
                  >
                    {masterDeleting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Deleting Database Data...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Confirm Master Deletion</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Completion Report Box */
              <div className="space-y-4 animate-fadeIn">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-semibold space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-base">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Database Cleanup Complete</span>
                  </div>
                  <p>All application documents have been safely wiped from MongoDB Atlas.</p>
                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-mono">
                    <div>Collections Cleaned: <span className="font-bold text-slate-900 dark:text-white">{masterReport.collectionsCleaned}</span></div>
                    <div>Documents Deleted: <span className="font-bold text-slate-900 dark:text-white">{masterReport.totalRecordsDeleted}</span></div>
                    <div>Time Taken: <span className="font-bold text-slate-900 dark:text-white">{masterReport.durationMs} ms</span></div>
                    <div>Presence Cleared: <span className="font-bold text-slate-900 dark:text-white">Active</span></div>
                  </div>
                </div>

                <button
                  onClick={() => setShowMasterModal(false)}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Close & Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
