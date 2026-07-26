import React from 'react';
import { Sparkles, Heart, Trophy, ArrowRight, ShieldCheck, Zap, Smile } from 'lucide-react';

interface HeroSectionProps {
  onNavigate: (tab: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate }) => {
  return (
    <div className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24">
      {/* Background Subtle Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-20 right-10 w-[400px] h-[400px] bg-rose-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-60 left-10 w-[350px] h-[350px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        {/* Top Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 text-[11px] font-bold uppercase tracking-widest backdrop-blur-md shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>AI-POWERED POSITIVITY ENGINE</span>
            <span className="hidden sm:inline-block text-slate-300 dark:text-slate-500">•</span>
            <span className="hidden sm:inline-block text-slate-600 dark:text-slate-300 font-medium lowercase">advanced ai engine inside</span>
          </div>
        </div>

        {/* Hero Title & Tagline */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-7xl lg:text-8xl font-light tracking-tight text-slate-900 dark:text-white leading-none">
            Every <span className="font-black italic text-indigo-600 dark:text-indigo-400 drop-shadow-[0_0_25px_rgba(99,102,241,0.3)]">Smile</span> Creates <br className="hidden sm:block" />
            Energy.
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal">
            Experience the future of positivity with real-time AI-generated encouragement, interactive daily challenges, inspirational wisdom, and personalized motivation.
          </p>

          {/* Core Navigation Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <button
              onClick={() => onNavigate('ai-motivation')}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer border border-indigo-400/30"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>Get AI Motivation</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              onClick={() => onNavigate('quotes')}
              className="flex items-center gap-2 px-7 py-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-800 dark:text-white font-semibold text-sm transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-sm"
            >
              <Heart className="w-4 h-4 text-rose-500" />
              <span>Explore Quotes</span>
            </button>

            <button
              onClick={() => onNavigate('challenge')}
              className="flex items-center gap-2 px-7 py-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-800 dark:text-white font-semibold text-sm transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-sm"
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Daily Challenge</span>
            </button>
          </div>

          {/* Community Stats Indicator */}
          <p className="mt-6 text-xs font-semibold text-slate-500 dark:text-slate-500">
            Join <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">12,400+</span> users spreading positive energy today.
          </p>
        </div>

        {/* Visual Feature Cards Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-7 rounded-3xl bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 hover:border-indigo-500/40 transition-all group shadow-sm dark:shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Daily Inspiration</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Curated quotes across study, coding, success, and health categories with instant speech audio synthesis and share tools.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-7 rounded-3xl bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 hover:border-indigo-500/40 transition-all group shadow-sm dark:shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-500 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <Smile className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI Real-Time Motivation</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Express your current mood and receive tailored AI paragraphs, joyful daily goals, and personalized uplifting affirmations.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-7 rounded-3xl bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 hover:border-indigo-500/40 transition-all group shadow-sm dark:shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-500 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Admin Control & Analytics</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Secure administrative portal featuring real-time analytics graphs, session telemetry, and content moderation capabilities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
