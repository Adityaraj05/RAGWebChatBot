'use client';

import Link from 'next/link';
import { ReactNode, useState } from 'react';

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-bg-white dark:bg-[#0A0A0A] text-brand-text dark:text-white selection:bg-brand-primary/30">
      {/* Navbar */}
      <nav className="border-b border-gray-200 dark:border-white/10 backdrop-blur-md sticky top-0 z-50 bg-gray-50/80 dark:bg-[#0A0A0A]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight">MyWebChat</span>
          </div>
          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link
              href="/create"
              className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-dark text-white text-sm font-medium rounded-lg transition-all"
            >
              Create Chatbot
            </Link>
          </div>
          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
        {/* Mobile menu drawer */}
        {menuOpen && (
          <>
            <div className="sm:hidden fixed inset-0 bg-black/40 z-40 top-14" onClick={() => setMenuOpen(false)} aria-hidden />
            <div className="sm:hidden fixed top-14 left-0 right-0 z-50 bg-gray-50 dark:bg-[#0A0A0A] border-b border-gray-200 dark:border-white/10 py-4 px-4 shadow-lg">
              <Link href="/dashboard" className="block py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white" onClick={() => setMenuOpen(false)}>
                Dashboard
              </Link>
              <Link href="/create" className="block py-3 px-4 bg-brand-primary hover:bg-brand-primary-dark text-white text-sm font-medium rounded-lg w-fit" onClick={() => setMenuOpen(false)}>
                Create Chatbot
              </Link>
            </div>
          </>
        )}
      </nav>

      {/* Hero Section */}
      <div className="relative pt-10 sm:pt-20 pb-20 sm:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-50 dark:via-[#0A0A0A] to-gray-50 dark:to-[#0A0A0A]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 text-center">

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-gray-400 mb-6 sm:mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            AI-Powered Web Chat
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 sm:mb-6 leading-tight">
            Build Your Own <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">
              AI Chatbot Widget
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed px-1">
            Create embeddable chat widgets powered by OpenAI, Claude, or Gemini.
            Configure, deploy, and track—all from one dashboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/create"
              className="px-8 py-4 bg-brand-primary hover:bg-brand-primary-dark text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-primary/20 flex items-center gap-2 hover:translate-y-[-2px]"
            >
              Create Your Chatbot
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>

            <Link
              href="/dashboard"
              className="px-8 py-4 bg-gray-200 dark:bg-[#1A1A1A] hover:bg-gray-300 dark:hover:bg-[#252525] text-gray-900 dark:text-white font-semibold rounded-xl border border-gray-300 dark:border-white/10 transition-all hover:translate-y-[-2px]"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-20 sm:pb-32">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <FeatureCard
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />}
            title="Multi-Provider Support"
            desc="Connect to OpenAI, Claude, or Gemini with your own API keys"
          />
          <FeatureCard
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />}
            title="Easy Embed"
            desc="One line of code to add the widget to any website"
          />
          <FeatureCard
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />}
            title="Analytics Dashboard"
            desc="Track conversations, messages, and user engagement"
          />
          <FeatureCard
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />}
            title="Real-time Chat"
            desc="Instant responses powered by leading AI models"
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: ReactNode, title: string, desc: string }) {
  return (
    <div className="p-6 rounded-2xl bg-brand-bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 hover:border-brand-primary/20 transition-colors group">
      <div className="w-12 h-12 bg-brand-primary/10 dark:bg-brand-primary/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        <svg className="w-6 h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {icon}
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}
