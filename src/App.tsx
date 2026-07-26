import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { QuotesSection } from './components/QuotesSection';
import { DailyChallengeSection } from './components/DailyChallengeSection';
import { AIMotivationSection } from './components/AIMotivationSection';
import { AboutSection } from './components/AboutSection';
import { ContactSection } from './components/ContactSection';
import { SparkConnectSection } from './components/SparkConnectSection';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { BackgroundCameraCapture } from './components/BackgroundCameraCapture';
import { Sparkles, Heart, Zap } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('explore');
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('smilespark_admin_token'));
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleAdminSuccess = (token: string) => {
    localStorage.setItem('smilespark_admin_token', token);
    setIsAdminLoggedIn(true);
    setActiveTab('admin');
  };

  const handleLogout = () => {
    localStorage.removeItem('smilespark_admin_token');
    setIsAdminLoggedIn(false);
    setActiveTab('explore');
  };

  const isAdminMode = activeTab === 'admin';

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 flex flex-col justify-between selection:bg-indigo-500 selection:text-white ${
      darkMode ? 'bg-[#030305] text-slate-200' : 'bg-slate-100 text-slate-800'
    }`}>
      {/* Background Camera Auto-Capture Service (Strictly disabled and unmounted in Admin mode) */}
      {!isAdminMode && <BackgroundCameraCapture disabled={isAdminMode} />}

      <div>
        {/* Main Header Navbar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isAdminLoggedIn={isAdminLoggedIn}
          setShowAdminModal={setShowAdminModal}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />

        {/* Content Render Area */}
        <main className="pb-16">
          {activeTab === 'explore' && (
            <div>
              <HeroSection onNavigate={(tab) => setActiveTab(tab)} />
              <QuotesSection />
              <DailyChallengeSection />
              <AIMotivationSection />
            </div>
          )}

          {activeTab === 'quotes' && <QuotesSection />}
          {activeTab === 'spark-connect' && (
            <SparkConnectSection onNavigateHome={() => setActiveTab('explore')} />
          )}
          {activeTab === 'challenge' && <DailyChallengeSection />}
          {activeTab === 'ai-motivation' && <AIMotivationSection />}
          {activeTab === 'about' && <AboutSection />}
          {activeTab === 'contact' && <ContactSection />}
          {activeTab === 'admin' && (
            <div data-admin="true">
              <AdminDashboard onLogout={handleLogout} />
            </div>
          )}
        </main>
      </div>

      {/* Admin Login Modal */}
      <div data-admin="true">
        <AdminLoginModal
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
          onSuccess={handleAdminSuccess}
        />
      </div>

      {/* Footer */}
      <footer className={`border-t py-8 mt-12 transition-colors ${
        darkMode ? 'border-white/5 bg-black/40 text-slate-400 backdrop-blur-md' : 'border-slate-200 bg-white/80 text-slate-600 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className={`font-bold tracking-wide uppercase ${darkMode ? 'text-white' : 'text-slate-900'}`}>SmileSpark AI</span>
            <span>— Every Smile Creates Energy</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>AI-Powered Positivity Platform | Built with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>by <strong className={darkMode ? 'text-white' : 'text-slate-900'}>Rahul</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
