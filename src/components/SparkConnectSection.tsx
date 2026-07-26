import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { ChatMessage, ChatStats } from '../types';
import {
  Users,
  MessageSquare,
  ShieldCheck,
  Zap,
  Sparkles,
  Send,
  Smile,
  Image as ImageIcon,
  Clock,
  UserX,
  Flag,
  LogOut,
  RefreshCw,
  Heart,
  AlertTriangle,
  X,
  Check,
  CheckCheck,
  Compass,
} from 'lucide-react';

interface SparkConnectSectionProps {
  onNavigateHome?: () => void;
}

const ROTATING_QUOTES = [
  'A single positive message can change someone’s entire day.',
  'Be the reason someone smiles when they look at their phone today.',
  'Kindness is a language that everyone understands.',
  'Your words have the power to lift hearts and inspire hope.',
  'Connecting with a stranger is a reminder that we are never alone.',
];

const EMOJI_LIST = ['😊', '❤️', '🌟', '🚀', '🎉', '🔥', '✨', '👏', '🤗', '💪', '🌸', '🍕', '☕️', '🙏'];

export const SparkConnectSection: React.FC<SparkConnectSectionProps> = ({ onNavigateHome }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chatState, setChatState] = useState<'landing' | 'waiting' | 'active' | 'ended'>('landing');
  const [stats, setStats] = useState<ChatStats>({
    usersOnline: 18,
    waitingCount: 0,
    activeChatsCount: 2,
    totalChatSessions: 142,
    avgChatDurationSec: 210,
    imagesShared: 38,
    reportsSubmitted: 1,
    dailyChatCount: 48,
    peakOnline: 24,
  });

  // Room & Identity
  const [roomId, setRoomId] = useState<string | null>(null);
  const [myIdentity, setMyIdentity] = useState<string>('You');
  const [partnerName, setPartnerName] = useState<string>('Anonymous Partner');
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [partnerTyping, setPartnerTyping] = useState<boolean>(false);
  const [partnerRead, setPartnerRead] = useState<boolean>(false);

  // Timers & Waiting
  const [waitingQuoteIndex, setWaitingQuoteIndex] = useState<number>(0);
  const [connectionTimeSec, setConnectionTimeSec] = useState<number>(0);
  const [endMessage, setEndMessage] = useState<string>('');

  // UI Modals & Popovers
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportReason, setReportReason] = useState<string>('Inappropriate language');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Session & Persona State (Stored in localStorage without authentication)
  const [sessionId, setSessionId] = useState<string>('');
  const [userAlias, setUserAlias] = useState<string>('');
  const [userAvatarColor, setUserAvatarColor] = useState<string>('bg-indigo-500');

  useEffect(() => {
    // 1. Get or Generate Session ID
    let sid = localStorage.getItem('smilespark_session_id');
    if (!sid) {
      sid = `spark_sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem('smilespark_session_id', sid);
    }
    setSessionId(sid);

    // 2. Get or Generate Anonymous Persona Alias
    let alias = localStorage.getItem('smilespark_alias');
    if (!alias) {
      const PERSONA_NAMES = [
        `Spark User #${Math.floor(1000 + Math.random() * 8999)}`,
        'Dream Walker 🌌',
        'Blue Star ⭐️',
        'Happy Panda 🐼',
        'Sunshine Bloom 🌻',
        'Cosmic Spark ✨',
        'Joy Explorer 🚀',
        'Kind Heart 💖',
        'Golden Ray ☀️',
        'Serene Spirit 🌊',
      ];
      alias = PERSONA_NAMES[Math.floor(Math.random() * PERSONA_NAMES.length)];
      localStorage.setItem('smilespark_alias', alias);
    }
    setUserAlias(alias);

    // 3. Get or Generate Avatar Color
    let color = localStorage.getItem('smilespark_avatar_color');
    if (!color) {
      const COLORS = ['bg-rose-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-teal-500'];
      color = COLORS[Math.floor(Math.random() * COLORS.length)];
      localStorage.setItem('smilespark_avatar_color', color);
    }
    setUserAvatarColor(color);
  }, []);

  const shufflePersona = () => {
    const PERSONA_NAMES = [
      `Spark User #${Math.floor(1000 + Math.random() * 8999)}`,
      'Dream Walker 🌌',
      'Blue Star ⭐️',
      'Happy Panda 🐼',
      'Sunshine Bloom 🌻',
      'Cosmic Spark ✨',
      'Joy Explorer 🚀',
      'Kind Heart 💖',
      'Golden Ray ☀️',
      'Serene Spirit 🌊',
    ];
    const COLORS = ['bg-rose-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-teal-500'];
    const newAlias = PERSONA_NAMES[Math.floor(Math.random() * PERSONA_NAMES.length)];
    const newColor = COLORS[Math.floor(Math.random() * COLORS.length)];

    setUserAlias(newAlias);
    setUserAvatarColor(newColor);
    localStorage.setItem('smilespark_alias', newAlias);
    localStorage.setItem('smilespark_avatar_color', newColor);

    if (socket) {
      socket.emit('register_session', { sessionId, alias: newAlias });
    }
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Initialize Socket Connection
  useEffect(() => {
    const s = io();
    setSocket(s);

    s.on('connect', () => {
      const sid = localStorage.getItem('smilespark_session_id') || sessionId;
      const alias = localStorage.getItem('smilespark_alias') || userAlias;
      s.emit('register_session', { sessionId: sid, alias });
      s.emit('get_online_stats');
    });

    s.on('online_stats_update', (data: ChatStats) => {
      if (data) setStats(data);
    });

    s.on('online_stats_response', (data: ChatStats) => {
      if (data) setStats(data);
    });

    s.on('waiting_in_queue', (data: { position: number; estimatedWaitSec: number }) => {
      setChatState('waiting');
    });

    s.on(
      'match_found',
      (data: {
        roomId: string;
        myIdentity: string;
        partnerName: string;
        icebreakers: string[];
        startTime: number;
      }) => {
        setRoomId(data.roomId);
        setMyIdentity(data.myIdentity);
        setPartnerName(data.partnerName);
        setIcebreakers(data.icebreakers || []);
        setMessages([]);
        setConnectionTimeSec(0);
        setChatState('active');
      }
    );

    s.on('matching_cancelled', () => {
      setChatState('landing');
    });

    s.on('receive_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      setPartnerTyping(false);
      // Automatically send read receipt if msg is from partner
      if (s && dataRoomRef.current) {
        s.emit('mark_read', { roomId: dataRoomRef.current });
      }
    });

    s.on('partner_typing', (data: { isTyping: boolean }) => {
      setPartnerTyping(data.isTyping);
    });

    s.on('partner_read', () => {
      setPartnerRead(true);
    });

    s.on('partner_left', (data: { message: string }) => {
      setEndMessage(data.message || 'Conversation ended.');
      setChatState('ended');
      setRoomId(null);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const dataRoomRef = useRef<string | null>(roomId);
  useEffect(() => {
    dataRoomRef.current = roomId;
  }, [roomId]);

  // Connection Duration Timer
  useEffect(() => {
    let interval: any = null;
    if (chatState === 'active') {
      interval = setInterval(() => {
        setConnectionTimeSec((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [chatState]);

  // Waiting Screen Quote Rotation
  useEffect(() => {
    let interval: any = null;
    if (chatState === 'waiting') {
      interval = setInterval(() => {
        setWaitingQuoteIndex((prev) => (prev + 1) % ROTATING_QUOTES.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [chatState]);

  // Auto Scroll Chat
  useEffect(() => {
    if (chatState === 'active') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, partnerTyping, chatState]);

  // Handlers
  const handleStartChat = () => {
    if (socket) {
      setChatState('waiting');
      socket.emit('start_matching');
    }
  };

  const handleCancelWaiting = () => {
    if (socket) {
      socket.emit('cancel_matching');
      setChatState('landing');
    }
  };

  const handleSendMessage = (textToSend?: string, imageToSend?: string) => {
    const finalMsg = textToSend !== undefined ? textToSend : inputText;
    if ((!finalMsg.trim() && !imageToSend) || !socket || !roomId) return;

    setPartnerRead(false);

    socket.emit('send_message', {
      roomId,
      text: finalMsg.trim(),
      image: imageToSend,
      senderSessionId: sessionId,
      senderAlias: userAlias,
    });

    if (!textToSend && !imageToSend) {
      setInputText('');
    }
    setImagePreview(null);
    setShowEmojiPicker(false);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!socket || !roomId) return;

    socket.emit('typing_status', { roomId, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (socket && roomId) {
        socket.emit('typing_status', { roomId, isTyping: false });
      }
    }, 1500);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setImagePreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLeaveChat = () => {
    if (socket && roomId) {
      socket.emit('leave_chat', { roomId });
      setEndMessage('You left the conversation.');
      setChatState('ended');
      setRoomId(null);
    }
  };

  const handleNextChat = () => {
    if (socket) {
      if (roomId) {
        socket.emit('leave_chat', { roomId });
      }
      setRoomId(null);
      setMessages([]);
      setPartnerTyping(false);
      setPartnerRead(false);
      setChatState('waiting');
      socket.emit('start_matching');
    }
  };

  const handleReportUser = () => {
    if (socket && roomId) {
      socket.emit('report_user', { roomId, reason: reportReason });
      setShowReportModal(false);
      setEndMessage('User reported. The conversation has ended.');
      setChatState('ended');
      setRoomId(null);
    }
  };

  const handleBlockUser = () => {
    if (confirm(`Are you sure you want to block ${partnerName}? You will not be matched again.`)) {
      if (socket && roomId) {
        socket.emit('block_user', { roomId });
        setEndMessage('User blocked. The conversation has ended.');
        setChatState('ended');
        setRoomId(null);
      }
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto font-sans min-h-[80vh] flex flex-col justify-center">
      {/* LANDING STATE */}
      {chatState === 'landing' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Hero Banner */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-4 h-4 text-rose-500 animate-pulse" />
              <span>Spark Connect Live • Random Positivity Chat</span>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                NEW
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Spread Joy with Strangers in Real-Time
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Connect anonymously with positive minds across the world. Share encouragement, ask ice-breakers, and brighten someone's day in a safe environment.
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm text-center">
              <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Online Now</span>
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.usersOnline}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm text-center">
              <div className="flex items-center justify-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase mb-1">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Active Chats</span>
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.activeChatsCount}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm text-center">
              <div className="flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase mb-1">
                <Heart className="w-3.5 h-3.5" />
                <span>Total Sessions</span>
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.totalChatSessions}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm text-center">
              <div className="flex items-center justify-center gap-1.5 text-rose-600 dark:text-rose-400 text-xs font-bold uppercase mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Avg Duration</span>
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {Math.round(stats.avgChatDurationSec / 60)}m {stats.avgChatDurationSec % 60}s
              </span>
            </div>
          </div>

          {/* Guidelines & Illustration Box */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-2xl border border-indigo-500/30 grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
            <div>
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Safe & Anonymous Guarantee</span>
              </div>
              <h3 className="text-2xl font-black text-white">Community Safety Guidelines</h3>

              <ul className="mt-4 space-y-3 text-xs sm:text-sm text-indigo-100">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Anonymous Identities:</strong> Temporary names like "Happy Panda 🐼" or "Spark User #1842" protect your personal privacy.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Kindness First:</strong> Be polite, respectful, and encouraging. Toxic or hateful language is strictly prohibited.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Safety Tools:</strong> Instantly report or block any inappropriate users with a single click.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Zero Logged Messages:</strong> Messages are ephemeral in memory and never permanently stored.
                  </span>
                </li>
              </ul>
            </div>

            {/* Start CTA Card with Persona Display */}
            <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center flex flex-col items-center justify-center">
              <div className={`w-16 h-16 rounded-2xl ${userAvatarColor} border-2 border-white/40 text-white flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/20`}>
                <span className="text-2xl font-black">{userAlias ? userAlias.substring(0, 1) : 'S'}</span>
              </div>
              <h4 className="text-lg font-black text-white mb-0.5">{userAlias || 'Anonymous Sparker'}</h4>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] font-mono text-indigo-200 mb-3">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Session ID: {sessionId ? `${sessionId.substring(0, 16)}...` : 'Generating...'}</span>
              </div>

              <div className="flex items-center gap-2 mb-5">
                <button
                  type="button"
                  onClick={shufflePersona}
                  className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/15"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Shuffle Persona</span>
                </button>
              </div>

              <button
                onClick={handleStartChat}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-indigo-600 to-indigo-500 hover:from-rose-400 hover:to-indigo-400 text-white font-black text-base shadow-xl shadow-rose-500/25 transition-all transform hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2 border border-white/20"
              >
                <Sparkles className="w-5 h-5" />
                <span>Start Spark Chat Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WAITING STATE */}
      {chatState === 'waiting' && (
        <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl text-center max-w-xl mx-auto space-y-6 animate-fadeIn">
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30 border-t-indigo-600 animate-spin" />
            <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-8 h-8 animate-pulse" />
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              Finding someone to spread positivity...
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Matching you randomly with another online user in real-time.
            </p>
          </div>

          {/* Rotating Quotes */}
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-500/20 text-indigo-900 dark:text-indigo-200 text-xs sm:text-sm font-medium italic min-h-[4rem] flex items-center justify-center">
            "{ROTATING_QUOTES[waitingQuoteIndex]}"
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Estimated waiting time: ~5 seconds</span>
          </div>

          <button
            onClick={handleCancelWaiting}
            className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 font-bold text-sm transition-colors cursor-pointer"
          >
            Cancel Search
          </button>
        </div>
      )}

      {/* ACTIVE CHAT STATE */}
      {chatState === 'active' && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col h-[82vh] sm:h-[75vh] min-h-[480px] max-w-4xl mx-auto animate-fadeIn">
          {/* Header */}
          <div className="p-3 sm:p-4 sm:px-6 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-2xl bg-gradient-to-tr from-indigo-600 to-rose-500 text-white font-black text-base sm:text-lg flex items-center justify-center shadow-sm">
                {partnerName.charAt(0)}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-950" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                  <span className="truncate">{partnerName}</span>
                  <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold shrink-0">
                    Live
                  </span>
                </h4>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  You: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{myIdentity}</span>
                </p>
              </div>
            </div>

            {/* Timer & Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>{formatTimer(connectionTimeSec)}</span>
              </div>

              <button
                onClick={() => setShowReportModal(true)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                title="Report User"
              >
                <Flag className="w-4 h-4" />
              </button>

              <button
                onClick={handleBlockUser}
                className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                title="Block User"
              >
                <UserX className="w-4 h-4" />
              </button>

              <button
                onClick={handleNextChat}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-xs min-h-[38px]"
                title="Find a new random partner"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Find New</span>
              </button>

              <button
                onClick={handleLeaveChat}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer min-h-[38px]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">End</span>
              </button>
            </div>
          </div>

          {/* Icebreakers Banner */}
          {icebreakers.length > 0 && messages.length < 3 && (
            <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-500/20 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase shrink-0 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5" />
                <span>Ice-breakers:</span>
              </span>
              {icebreakers.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-3 py-1 rounded-full bg-white dark:bg-white/10 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 text-xs font-medium border border-indigo-200 dark:border-white/10 transition-all shrink-0 cursor-pointer shadow-xs"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
            {messages.length === 0 && (
              <div className="text-center py-10 max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Connected with {partnerName}!
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Say hi, share an encouraging thought, or tap an ice-breaker above to get started.
                </p>
              </div>
            )}

            {messages.map((msg) => {
              const isMe = msg.senderSocketId === socket?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <span className="text-[10px] text-slate-400 px-1 font-semibold">
                    {isMe ? 'You' : msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <div
                    className={`max-w-[80%] sm:max-w-[65%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-500/10'
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-tl-none shadow-xs'
                    }`}
                  >
                    {msg.image && (
                      <img
                        src={msg.image}
                        alt="Shared"
                        className="rounded-xl max-h-60 w-auto object-cover mb-2 border border-black/10"
                      />
                    )}
                    {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                  </div>

                  {isMe && (
                    <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold flex items-center gap-0.5 px-1">
                      {partnerRead ? (
                        <>
                          <CheckCheck className="w-3 h-3 text-emerald-500" />
                          <span>Seen</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Delivered</span>
                        </>
                      )}
                    </span>
                  )}
                </div>
              );
            })}

            {partnerTyping && (
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium italic py-1">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                </div>
                <span>{partnerName} is typing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Image Preview Banner */}
          {imagePreview && (
            <div className="p-3 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img src={imagePreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ready to send photo
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setImagePreview(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSendMessage(undefined, imagePreview)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          )}

          {/* Input Toolbar */}
          <div className="p-3 sm:p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-white/10 relative">
            {/* Emoji Popover */}
            {showEmojiPicker && (
              <div className="absolute bottom-16 left-4 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 grid grid-cols-7 gap-2 z-20">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setInputText((prev) => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="p-2 text-xl hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors cursor-pointer"
                title="Add Emoji"
              >
                <Smile className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors cursor-pointer"
                title="Share Image"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              <input
                type="text"
                value={inputText}
                onChange={handleTyping}
                placeholder={`Type a positive message to ${partnerName}...`}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />

              <button
                type="submit"
                disabled={!inputText.trim() && !imagePreview}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all disabled:opacity-40 cursor-pointer shadow-md shadow-indigo-500/20"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CHAT ENDED STATE */}
      {chatState === 'ended' && (
        <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl text-center max-w-lg mx-auto space-y-6 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8 fill-rose-500/20" />
          </div>

          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              Hope this conversation made someone's day brighter! ✨
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
              {endMessage || 'The conversation has ended.'}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleStartChat}
              className="flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Find Another Chat</span>
            </button>

            {onNavigateHome && (
              <button
                onClick={onNavigateHome}
                className="flex-1 py-3.5 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 font-bold text-sm transition-colors cursor-pointer"
              >
                Return to Explore
              </button>
            )}
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 font-sans">
            <button
              onClick={() => setShowReportModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Report {partnerName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Help us keep the SmileSpark AI community safe and uplifting.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                Reason for report:
              </label>
              {[
                'Inappropriate language or profanity',
                'Spam or promotional links',
                'Harassment or offensive behavior',
                'Inappropriate shared image',
                'Other safety concern',
              ].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setReportReason(reason)}
                  className={`w-full p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                    reportReason === reason
                      ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300'
                      : 'bg-slate-50 dark:bg-black/30 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{reason}</span>
                  {reportReason === reason && <Check className="w-4 h-4 text-rose-500" />}
                </button>
              ))}
            </div>

            <button
              onClick={handleReportUser}
              className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-500/25 transition-all cursor-pointer"
            >
              Submit Report & End Chat
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
