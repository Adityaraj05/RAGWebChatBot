'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';

interface Chatbot {
    id: string;
    name: string;
    embed_code: string;
    llm_provider: string;
    model_name: string;
    primary_color: string;
    welcome_message: string;
    system_prompt: string;
    created_at: string;
}

export default function ChatbotPage() {
    const params = useParams();
    const [chatbot, setChatbot] = useState<Chatbot | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        async function fetchChatbot() {
            const { data } = await supabase
                .from('chatbots')
                .select('*')
                .eq('id', params.id)
                .single();

            setChatbot(data);
            setLoading(false);
        }
        fetchChatbot();
    }, [params.id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-brand-bg-white dark:bg-[#0A0A0A] flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-brand-primary border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!chatbot) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-white text-xl">Chatbot not found</div>
            </div>
        );
    }

    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const embedCode = `<script src="${appUrl}/widget.js" data-chatbot-id="${chatbot.embed_code}" async></script>`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(embedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-brand-bg-white dark:bg-[#0A0A0A] text-brand-text dark:text-white selection:bg-brand-primary/30 py-6 sm:py-12 px-4 sm:px-6">
            {/* Back button */}
            <div className="max-w-4xl mx-auto mb-4 sm:mb-6">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center text-gray-500 hover:text-white transition-colors text-sm"
                >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Dashboard
                </Link>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header Card */}
                <div className="bg-[#111] border border-white/5 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div
                                className="w-14 h-14 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: chatbot.primary_color }}
                            >
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white">{chatbot.name}</h1>
                                <p className="text-gray-400 mt-1">
                                    {chatbot.llm_provider.toUpperCase()} • {chatbot.model_name}
                                </p>
                            </div>
                        </div>
                        <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm border border-green-500/30">
                            Active
                        </span>
                    </div>
                </div>

                {/* Embed Code Card */}
                <div className="backdrop-blur-xl bg-brand-secondary/5 rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 border border-brand-secondary/20">
                    <h2 className="text-xl font-semibold text-brand-heading dark:text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-brand-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        Embed Code
                    </h2>
                    <p className="text-brand-text mb-4">
                        Add this code snippet before the closing <code className="text-brand-primary">&lt;/body&gt;</code> tag of your website.
                    </p>

                    <div className="relative">
                        <pre className="bg-brand-bg-light dark:bg-[#1A1A1A] text-brand-secondary dark:text-brand-accent p-4 rounded-xl overflow-x-auto text-sm border border-brand-secondary/10">
                            {embedCode}
                        </pre>
                        <button
                            onClick={copyToClipboard}
                            className="absolute top-3 right-3 px-3 py-1.5 bg-brand-primary hover:bg-brand-primary-dark text-white text-sm rounded-lg transition-colors flex items-center gap-1 shadow-md shadow-brand-primary/20"
                        >
                            {copied ? (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Copy Snippet
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <a
                        href={`/test.html?chatbot=${chatbot.embed_code}`}
                        target="_blank"
                        className="backdrop-blur-xl bg-yellow-500/20 border border-yellow-500/30 rounded-2xl p-6 hover:bg-yellow-500/30 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-yellow-500/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-yellow-100">Test Widget</h3>
                                <p className="text-yellow-200/70 text-sm">Preview your chatbot in action</p>
                            </div>
                        </div>
                    </a>

                    <Link
                        href={`/chatbot/${chatbot.id}/analytics`}
                        className="backdrop-blur-xl bg-green-500/20 border border-green-500/30 rounded-2xl p-6 hover:bg-green-500/30 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-500/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-green-100">View Analytics</h3>
                                <p className="text-green-200/70 text-sm">Track conversations & messages</p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Knowledge Base Card */}
                <div className="backdrop-blur-xl bg-blue-500/10 border border-blue-500/20 rounded-3xl shadow-2xl p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            Knowledge Base
                        </h2>
                        <Link
                            href="/dashboard"
                            className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                        >
                            Manage in Dashboard
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </Link>
                    </div>

                    <p className="text-gray-400 text-sm mb-6">
                        Upload documents or index websites to give your chatbot context-aware knowledge.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
                        >
                            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <span className="text-white font-medium">Upload Documents</span>
                                <p className="text-gray-500 text-xs">PDF, TXT, DOCX files</p>
                            </div>
                        </Link>

                        <Link
                            href="/dashboard"
                            className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
                        >
                            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                            </div>
                            <div>
                                <span className="text-white font-medium">Index Website</span>
                                <p className="text-gray-500 text-xs">Crawl pages from URL</p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Configuration Details */}
                <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl p-8 border border-white/20">
                    <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Configuration
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <span className="text-gray-400 text-sm">Welcome Message</span>
                                <p className="text-white mt-1">{chatbot.welcome_message}</p>
                            </div>
                            <div>
                                <span className="text-gray-400 text-sm">System Prompt</span>
                                <p className="text-white mt-1 text-sm bg-[#1A1A1A] p-3 rounded-lg border border-white/5">
                                    {chatbot.system_prompt}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <span className="text-gray-400 text-sm">Primary Color</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <div
                                        className="w-6 h-6 rounded-md border border-white/5"
                                        style={{ backgroundColor: chatbot.primary_color }}
                                    ></div>
                                    <span className="text-white font-mono">{chatbot.primary_color}</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-gray-400 text-sm">Created</span>
                                <p className="text-white mt-1">
                                    {new Date(chatbot.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
