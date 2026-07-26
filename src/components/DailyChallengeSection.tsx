import React, { useState, useEffect } from 'react';
import { DailyChallenge } from '../types';
import confetti from 'canvas-confetti';
import { Trophy, CheckCircle2, Circle, Flame, Sparkles } from 'lucide-react';

export const DailyChallengeSection: React.FC = () => {
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('smilespark_completed_challenges') || '[]');
    } catch {
      return [];
    }
  });
  const [streakDays, setStreakDays] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('smilespark_streak') || 5);
    } catch {
      return 5;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/challenge/today');
      const data = await res.json();
      if (data.success && data.data) {
        setChallenges(data.data);
      }
    } catch (err) {
      console.error('Error loading challenges:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = (id: string, points: number) => {
    let updated: string[];
    if (completedIds.includes(id)) {
      updated = completedIds.filter((item) => item !== id);
    } else {
      updated = [...completedIds, id];
      // Trigger festive confetti!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#f43f5e', '#f59e0b', '#6366f1', '#10b981'],
      });
      // If user completes all today's challenges, boost streak
      if (updated.length === challenges.length) {
        const newStreak = streakDays + 1;
        setStreakDays(newStreak);
        localStorage.setItem('smilespark_streak', newStreak.toString());
      }
    }
    setCompletedIds(updated);
    localStorage.setItem('smilespark_completed_challenges', JSON.stringify(updated));
  };

  const totalPoints = completedIds.reduce((sum, id) => {
    const item = challenges.find((c) => c.id === id);
    return sum + (item ? item.points : 0);
  }, 0);

  const completionPercentage =
    challenges.length > 0 ? Math.round((completedIds.length / challenges.length) * 100) : 0;

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto font-sans">
      {/* Title */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Trophy className="w-3.5 h-3.5" />
          <span>Consistency & Habits</span>
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white">
          Daily Spark Challenges
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Small daily actions build unstoppable positive momentum. Complete today's micro-tasks!
        </p>
      </div>

      {/* Progress & Streak Banner */}
      <div className="mb-8 p-4 sm:p-6 rounded-3xl bg-indigo-900 dark:bg-gradient-to-r dark:from-indigo-950 dark:via-slate-900 dark:to-indigo-900 border border-indigo-700 dark:border-indigo-500/30 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-xl sm:text-2xl font-black text-white">
            {completionPercentage}%
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold">Today's Progress</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold text-white">
                {completedIds.length} of {challenges.length} Done
              </span>
            </div>
            <p className="text-xs sm:text-sm text-indigo-100 dark:text-slate-300 mt-1">
              Earned <span className="font-extrabold text-amber-300">{totalPoints} Spark Points</span> today
            </p>
          </div>
        </div>

        {/* Streak Counter */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md w-full sm:w-auto justify-center sm:justify-start">
          <Flame className="w-6 h-6 text-amber-400 animate-pulse shrink-0" />
          <div>
            <span className="block text-[10px] uppercase font-bold text-amber-300 tracking-wider">Current Streak</span>
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-white">{streakDays} Days Strong! 🔥</span>
          </div>
        </div>
      </div>

      {/* Challenge List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challenges.map((challenge) => {
            const isDone = completedIds.includes(challenge.id);
            return (
              <div
                key={challenge.id}
                onClick={() => handleToggleComplete(challenge.id, challenge.points)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 shadow-sm ${
                  isDone
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-300'
                    : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-indigo-500/40 hover:bg-slate-50 dark:hover:bg-white/10'
                }`}
              >
                <div className="mt-1">
                  {isDone ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <Circle className="w-6 h-6 text-slate-400 hover:text-indigo-500 transition-colors" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`text-base font-bold ${
                        isDone
                          ? 'line-through text-slate-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {challenge.title}
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 text-amber-800 dark:text-amber-400 text-xs font-bold">
                      +{challenge.points} pts
                    </span>
                  </div>

                  <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {challenge.description}
                  </p>

                  <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                      <Sparkles className="w-3 h-3" />
                      {challenge.category}
                    </span>
                    <span>•</span>
                    <span>{challenge.completedCount + (isDone ? 1 : 0)} people completed</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
