import React, { useState } from 'react';
import { AIMotivation } from '../types';
import { Sparkles, Smile, Frown, Coffee, Rocket, Zap, Volume2, Copy, Check, Target, Compass, Heart } from 'lucide-react';

export const AIMotivationSection: React.FC = () => {
  const [selectedMood, setSelectedMood] = useState<string>('Stressed');
  const [contextNote, setContextNote] = useState<string>('');
  const [motivation, setMotivation] = useState<AIMotivation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [speaking, setSpeaking] = useState<boolean>(false);

  const moods = [
    { id: 'Happy', label: 'Happy', emoji: '😊', icon: Smile, color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
    { id: 'Sad', label: 'Sad', emoji: '🌧️', icon: Frown, color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
    { id: 'Tired', label: 'Tired', emoji: '🥱', icon: Coffee, color: 'text-purple-500 bg-purple-500/10 border-purple-500/30' },
    { id: 'Excited', label: 'Excited', emoji: '🚀', icon: Rocket, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' },
    { id: 'Stressed', label: 'Stressed', emoji: '⚡', icon: Zap, color: 'text-rose-500 bg-rose-500/10 border-rose-500/30' },
  ];

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood: selectedMood,
          context: contextNote,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMotivation(data.data);
      }
    } catch (err) {
      console.error('Error generating AI motivation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAll = () => {
    if (!motivation) return;
    const text = `SmileSpark AI Encouragement:\n\n${motivation.paragraph}\n\nAffirmation: ${motivation.affirmation}\nGoal: ${motivation.dailyGoal}\nTagline: ${motivation.encouragement}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (!motivation) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const textToSpeak = `${motivation.paragraph} Your affirmation for today: ${motivation.affirmation}. Your daily goal: ${motivation.dailyGoal}. ${motivation.encouragement}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.95;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto font-sans">
      {/* Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Advanced AI Engine</span>
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white">
          Personalized AI Motivation
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Tell us how you are feeling right now. Our AI will craft tailor-made encouragement, an affirmation, and a micro-goal for your day.
        </p>
      </div>

      {/* Input Box & Mood Selector */}
      <div className="p-4 sm:p-8 rounded-3xl bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-2xl mb-8">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          1. How are you feeling today?
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 mb-6">
          {moods.map((m) => {
            const isSelected = selectedMood === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMood(m.id)}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 min-h-[64px] ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/20 border-indigo-500'
                    : 'bg-slate-50 dark:bg-black/30 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-xs font-semibold">{m.label}</span>
              </button>
            );
          })}
        </div>

        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          2. Any specific context or goal? (Optional)
        </label>
        <textarea
          value={contextNote}
          onChange={(e) => setContextNote(e.target.value)}
          placeholder="e.g. Preparing for an important presentation, or feeling overwhelmed with deadlines..."
          className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none h-20 placeholder:text-slate-400"
        />

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="mt-6 w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-indigo-400/30"
        >
          {loading ? (
            <>
              <Sparkles className="w-5 h-5 animate-spin" />
              <span>Generating AI Response...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Spark AI Motivation Now</span>
            </>
          )}
        </button>
      </div>

      {/* Result Display */}
      {motivation && (
        <div className="p-8 rounded-3xl bg-indigo-900 dark:bg-gradient-to-br dark:from-indigo-950/90 dark:via-slate-900 dark:to-indigo-900/90 text-white border border-indigo-700 dark:border-indigo-500/30 shadow-2xl relative overflow-hidden animate-fadeIn">
          {/* Subtle glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold">
                Mood: {selectedMood}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSpeak}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  speaking ? 'bg-indigo-600 text-white animate-bounce' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title="Read AI Motivation Aloud"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleCopyAll}
                className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
                title="Copy Response"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Paragraph */}
          <div className="mb-6">
            <p className="text-base sm:text-lg text-slate-100 leading-relaxed font-light">
              "{motivation.paragraph}"
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {/* Positive Affirmation */}
            <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase mb-1">
                <Compass className="w-4 h-4" />
                <span>Daily Affirmation</span>
              </div>
              <p className="text-sm font-semibold text-white">{motivation.affirmation}</p>
            </div>

            {/* Daily Goal */}
            <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase mb-1">
                <Target className="w-4 h-4" />
                <span>Personalized Micro-Goal</span>
              </div>
              <p className="text-sm font-semibold text-white">{motivation.dailyGoal}</p>
            </div>
          </div>

          {/* Encouragement Tagline */}
          <div className="mt-6 text-center pt-4 border-t border-white/10">
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-indigo-200">
              <Heart className="w-4 h-4 text-rose-400 fill-rose-400/30" />
              {motivation.encouragement}
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
