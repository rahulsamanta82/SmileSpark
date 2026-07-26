import React from 'react';
import { Sparkles, Code2, Cpu, ShieldCheck, User, Zap, CheckCircle2 } from 'lucide-react';

export const AboutSection: React.FC = () => {
  const techStack = [
    { name: 'React 19', desc: 'Modern reactive frontend framework' },
    { name: 'TypeScript', desc: 'Type-safe scalable architecture' },
    { name: 'Express.js', desc: 'Full-stack REST API server' },
    { name: 'Advanced AI Engine', desc: 'Multimodal AI processing engine' },
    { name: 'Tailwind CSS v4', desc: 'Utility-first modern styling' },
    { name: 'Recharts', desc: 'Interactive real-time data visualizer' },
  ];

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Title */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Zap className="w-4 h-4" />
          <span>AI-Powered Positivity Platform</span>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          About SmileSpark AI
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          SmileSpark AI is an enterprise-grade platform designed to uplift human happiness using artificial intelligence, real-time analytics, and positive reinforcement.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Project Objective */}
        <div className="p-8 rounded-3xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Project Vision</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            In a fast-paced world, mental wellness and positivity play a critical role in productivity and happiness. SmileSpark AI bridges technology and psychology by delivering AI-generated affirmations, daily micro-goals, and interactive camera smile captures to foster a culture of optimism.
          </p>
        </div>

        {/* Developer Profile */}
        <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
            <User className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-1">Developer Profile</h3>
          <p className="text-xs text-indigo-300 uppercase font-bold tracking-wider mb-3">
            Designed & Developed by Rahul
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            Engineered as an AI-powered positivity platform. Features full-stack TypeScript architecture, server-side AI engine integration, JWT admin authentication, and real-time dashboard analytics.
          </p>
        </div>
      </div>

      {/* Tech Stack Grid */}
      <div className="p-8 rounded-3xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-indigo-500" />
          <span>Core Technology Architecture</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {techStack.map((tech) => (
            <div key={tech.name} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">{tech.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tech.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
