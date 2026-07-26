import React from 'react';
import { Sparkles, Camera, Heart, Trophy, Info, Mail, LayoutDashboard, Moon, Sun, Lock, Users, Zap } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdminLoggedIn: boolean;
  setShowAdminModal: (show: boolean) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isAdminLoggedIn,
  setShowAdminModal,
  darkMode,
  setDarkMode,
}) => {
  const navItems = [
    { id: 'explore', label: 'Explore', icon: Sparkles },
    { id: 'spark-connect', label: 'Spark Connect', icon: Users, badge: 'NEW' },
    { id: 'quotes', label: 'Quotes', icon: Heart },
    { id: 'challenge', label: 'Daily Challenge', icon: Trophy },
    { id: 'ai-motivation', label: 'AI Motivation', icon: Zap },
    { id: 'about', label: 'About', icon: Info },
    { id: 'contact', label: 'Contact', icon: Mail },
  ];

  return (
    <header className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-colors duration-200 ${
      darkMode ? 'bg-[#030305]/80 border-white/10 text-white' : 'bg-white/90 border-slate-200 text-slate-900 shadow-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => setActiveTab('explore')}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className={`text-lg font-black tracking-tight uppercase italic ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                SMILESPARK <span className="text-indigo-600 dark:text-indigo-400 not-italic font-extrabold">AI</span>
              </span>
              <span className="block text-[9px] font-bold text-indigo-500 dark:text-indigo-400/80 uppercase tracking-widest -mt-1">
                AI Positivity Platform
              </span>
            </div>
          </button>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    isActive
                      ? darkMode
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-bold shadow-sm'
                        : 'bg-indigo-100 text-indigo-700 border border-indigo-300 font-bold shadow-sm'
                      : darkMode
                      ? 'text-slate-400 hover:text-white hover:bg-white/5'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-rose-500 text-white animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* Theme Indicator / Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                darkMode
                  ? 'text-slate-300 hover:text-white hover:bg-white/5 border-white/10'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
              }`}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* Admin Portal Button */}
            <button
              onClick={() => {
                if (isAdminLoggedIn) {
                  setActiveTab('admin');
                } else {
                  setShowAdminModal(true);
                }
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/50'
                  : darkMode
                  ? 'bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 hover:border-indigo-500/40 hover:text-white'
                  : 'bg-slate-100 border border-slate-200 text-slate-800 hover:bg-slate-200 hover:border-indigo-400 hover:text-indigo-900'
              }`}
            >
              {isAdminLoggedIn ? (
                <>
                  <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Dashboard</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Admin Login</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Scroll Nav */}
        <div className={`lg:hidden flex items-center gap-1.5 overflow-x-auto py-2.5 px-0.5 no-scrollbar border-t ${
          darkMode ? 'border-white/5' : 'border-slate-200'
        }`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer min-h-[40px] ${
                  isActive
                    ? darkMode
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-bold shadow-xs'
                      : 'bg-indigo-100 text-indigo-700 border border-indigo-300 font-bold shadow-xs'
                    : darkMode
                    ? 'text-slate-400 hover:bg-white/5'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-rose-500 text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
