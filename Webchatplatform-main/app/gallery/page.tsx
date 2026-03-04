'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PROMPT_GALLERY, PromptTemplate } from '@/lib/prompts';

interface CustomPrompt {
    id: string;
    title: string;
    description: string;
    category: string;
    content: string;
    isCustom: boolean;
}

export default function GalleryPage() {
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [filter, setFilter] = useState('All');
    const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
    const [showEditor, setShowEditor] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);
    const [editorMode, setEditorMode] = useState<'manual' | 'ai'>('manual');
    const [aiDescription, setAiDescription] = useState('');
    const [generating, setGenerating] = useState(false);
    const [generateError, setGenerateError] = useState('');
    const [isAiGenerated, setIsAiGenerated] = useState(false);
    const [newPrompt, setNewPrompt] = useState({
        title: '',
        description: '',
        category: 'Custom',
        content: ''
    });

    useEffect(() => {
        // Load prompts from database
        const fetchPrompts = async () => {
            try {
                const response = await fetch('/api/prompts');
                const data = await response.json();
                if (data.prompts) {
                    const dbPrompts = data.prompts.map((p: any) => ({
                        id: p.id,
                        title: p.title,
                        description: p.description || '',
                        category: p.category || 'Custom',
                        content: p.content,
                        isCustom: true
                    }));
                    setCustomPrompts(dbPrompts);
                }
            } catch (error) {
                console.error('Error fetching prompts:', error);
            }
        };
        fetchPrompts();
    }, []);

    const allPrompts: CustomPrompt[] = [
        ...PROMPT_GALLERY.map(p => ({ ...p, isCustom: false })),
        ...customPrompts
    ];

    const categories = ['All', ...Array.from(new Set(allPrompts.map(p => p.category)))];
    const filteredPrompts = filter === 'All'
        ? allPrompts
        : allPrompts.filter(p => p.category === filter);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const savePrompt = async () => {
        if (!newPrompt.title || !newPrompt.content) return;

        try {
            // Save to database
            const response = await fetch('/api/prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newPrompt.title,
                    description: newPrompt.description,
                    category: newPrompt.category,
                    content: newPrompt.content,
                    is_ai_generated: isAiGenerated
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save prompt');
            }

            // Add to local state with the ID from database
            const savedPrompt: CustomPrompt = {
                id: data.prompt.id,
                title: data.prompt.title,
                description: data.prompt.description || '',
                category: data.prompt.category,
                content: data.prompt.content,
                isCustom: true
            };

            if (editingPrompt) {
                setCustomPrompts(customPrompts.map(p => p.id === editingPrompt.id ? savedPrompt : p));
            } else {
                setCustomPrompts([...customPrompts, savedPrompt]);
            }

            setShowEditor(false);
            setEditingPrompt(null);
            setNewPrompt({ title: '', description: '', category: 'Custom', content: '' });
            setEditorMode('manual');
            setAiDescription('');
            setIsAiGenerated(false);
        } catch (error: any) {
            console.error('Error saving prompt:', error);
            alert(error.message || 'Failed to save prompt');
        }
    };

    const editPrompt = (prompt: CustomPrompt) => {
        setEditingPrompt(prompt);
        setNewPrompt({
            title: prompt.title,
            description: prompt.description,
            category: prompt.category,
            content: prompt.content
        });
        setShowEditor(true);
    };

    const deletePrompt = async (id: string) => {
        try {
            const response = await fetch(`/api/prompts?id=${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete prompt');
            }

            const updated = customPrompts.filter(p => p.id !== id);
            setCustomPrompts(updated);
        } catch (error) {
            console.error('Error deleting prompt:', error);
            alert('Failed to delete prompt');
        }
    };

    const generateWithAI = async () => {
        if (!aiDescription.trim()) return;

        // Get API key from localStorage
        const savedApiKeys = localStorage.getItem('apiKeys');
        const apiKeys = savedApiKeys ? JSON.parse(savedApiKeys) : {};

        if (!apiKeys.openai) {
            setGenerateError('Please add your OpenAI API key in Settings first.');
            return;
        }

        setGenerating(true);
        setGenerateError('');

        try {
            const response = await fetch('/api/prompts/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: aiDescription,
                    apiKey: apiKeys.openai
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate prompt');
            }

            // Set the generated prompt content
            setNewPrompt({
                ...newPrompt,
                content: data.prompt,
                description: aiDescription
            });

            // Switch to manual mode to allow editing, but remember it was AI generated
            setEditorMode('manual');
            setIsAiGenerated(true);
        } catch (error: any) {
            setGenerateError(error.message || 'Failed to generate prompt');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="flex h-screen bg-brand-bg-white dark:bg-[#0A0A0A] text-brand-text dark:text-white selection:bg-brand-primary/30 overflow-hidden font-sans">
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />
            )}
            <aside className={`fixed lg:relative inset-y-0 left-0 z-50 w-80 max-w-[85vw] lg:w-96 lg:translate-x-0 flex flex-col border-r border-gray-200 dark:border-white/5 bg-white dark:bg-[#0A0A0A] transition-transform duration-200 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4 lg:p-6 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-3 group" onClick={() => setSidebarOpen(false)}>
                        <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center group-hover:bg-brand-primary-dark transition-colors">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </div>
                        <span className="font-bold text-lg tracking-tight text-brand-heading">MyWebChat</span>
                    </Link>
                    <button type="button" onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10" aria-label="Close menu">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-4 space-y-1 border-b border-gray-200 dark:border-white/5">
                    <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-all" onClick={() => setSidebarOpen(false)}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        Dashboard
                    </Link>
                    <Link href="/gallery" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20" onClick={() => setSidebarOpen(false)}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Prompt Gallery
                    </Link>
                    <Link href="/pricing-plans" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-all" onClick={() => setSidebarOpen(false)}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Pricing Plans
                    </Link>
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-all" onClick={() => setSidebarOpen(false)}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                    </Link>
                </div>

                <div className="flex-1 p-6">
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-white/5">
                    <Link
                        href="/create"
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-brand-primary hover:bg-brand-primary-dark text-white font-medium rounded-xl transition-all shadow-lg shadow-brand-primary/20"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create New Chatbot
                    </Link>
                </div>
            </aside>

            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-gray-50 dark:bg-[#0A0A0A] min-w-0">
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10" aria-label="Open menu">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">System Prompt Gallery</h1>
                            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Browse and use pre-crafted prompts for various use cases.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setEditingPrompt(null);
                            setNewPrompt({ title: '', description: '', category: 'Custom', content: '' });
                            setShowEditor(true);
                        }}
                        className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-dark text-white font-medium rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-brand-primary/20"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Prompt
                    </button>
                </header>

                {/* Filters */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === cat
                                ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                                : 'bg-brand-bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 text-brand-text dark:text-gray-400 hover:text-brand-heading dark:hover:text-white hover:border-brand-primary/30 dark:hover:border-white/20'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPrompts.map(prompt => (
                        <div key={prompt.id} className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-2xl p-6 flex flex-col hover:border-gray-300 dark:hover:border-white/10 transition-colors group">
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-semibold text-brand-secondary uppercase tracking-wider">{prompt.category}</span>
                                    {prompt.isCustom && (
                                        <span className="text-xs px-2 py-0.5 bg-brand-accent/20 text-brand-accent rounded-full">Custom</span>
                                    )}
                                </div>
                                <h3 className="text-lg font-bold text-brand-heading dark:text-white mb-1 group-hover:text-brand-primary transition-colors">{prompt.title}</h3>
                                <p className="text-sm text-brand-text dark:text-gray-400">{prompt.description}</p>
                            </div>

                            <div className="flex-1 bg-gray-100 dark:bg-[#0A0A0A] rounded-xl p-4 border border-gray-200 dark:border-white/5 mb-4 max-h-48 overflow-y-auto">
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                                    {prompt.content}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => copyToClipboard(prompt.content, prompt.id)}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${copiedId === prompt.id
                                        ? 'bg-green-500/20 text-green-600 dark:text-green-300 border border-green-500/30'
                                        : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-transparent'
                                        }`}
                                >
                                    {copiedId === prompt.id ? (
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
                                            Copy
                                        </>
                                    )}
                                </button>
                                {prompt.isCustom && (
                                    <>
                                        <button
                                            onClick={() => editPrompt(prompt)}
                                            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-all"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => deletePrompt(prompt.id)}
                                            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Editor Modal */}
            {showEditor && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#111] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-white/10">
                        <div className="p-6 border-b border-gray-200 dark:border-white/5">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                                {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
                            </h2>

                            {/* Mode Toggle */}
                            {!editingPrompt && (
                                <div className="flex gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-xl w-fit">
                                    <button
                                        onClick={() => setEditorMode('manual')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${editorMode === 'manual'
                                            ? 'bg-brand-primary text-white'
                                            : 'text-brand-text dark:text-gray-400 hover:text-brand-heading dark:hover:text-white'
                                            }`}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                        Write Manually
                                    </button>
                                    <button
                                        onClick={() => setEditorMode('ai')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${editorMode === 'ai'
                                            ? 'bg-brand-primary text-white'
                                            : 'text-brand-text dark:text-gray-400 hover:text-brand-heading dark:hover:text-white'
                                            }`}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                        Generate with AI
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="p-6 space-y-4">
                            {/* AI Mode */}
                            {editorMode === 'ai' && !editingPrompt && (
                                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4 mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Describe the chatbot you need
                                    </label>
                                    <textarea
                                        value={aiDescription}
                                        onChange={e => setAiDescription(e.target.value)}
                                        placeholder="e.g., A friendly customer support chatbot for an e-commerce store that helps with orders, returns, and product questions. It should be professional but warm."
                                        rows={4}
                                        className="w-full px-4 py-3 bg-white dark:bg-[#0A0A0A] border border-gray-300 dark:border-white/5 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                                    />
                                    {generateError && (
                                        <p className="text-red-400 text-sm mt-2">{generateError}</p>
                                    )}
                                    <button
                                        onClick={generateWithAI}
                                        disabled={generating || !aiDescription.trim()}
                                        className="mt-3 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {generating ? (
                                            <>
                                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                                Generate Prompt
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
                                <input
                                    type="text"
                                    value={newPrompt.title}
                                    onChange={e => setNewPrompt({ ...newPrompt, title: e.target.value })}
                                    placeholder="e.g., Customer Support Agent"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-300 dark:border-white/5 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                                <input
                                    type="text"
                                    value={newPrompt.description}
                                    onChange={e => setNewPrompt({ ...newPrompt, description: e.target.value })}
                                    placeholder="Brief description of what this prompt does"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-300 dark:border-white/5 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                                <input
                                    type="text"
                                    value={newPrompt.category}
                                    onChange={e => setNewPrompt({ ...newPrompt, category: e.target.value })}
                                    placeholder="e.g., Sales, Support, Custom"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-300 dark:border-white/5 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            {/* Only show Prompt Content in manual mode, or after AI generates content */}
                            {(editorMode === 'manual' || newPrompt.content) && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Prompt Content {editorMode === 'ai' && newPrompt.content && <span className="text-green-500 text-xs ml-2">✓ AI Generated</span>}
                                    </label>
                                    <textarea
                                        value={newPrompt.content}
                                        onChange={e => setNewPrompt({ ...newPrompt, content: e.target.value })}
                                        placeholder="Enter your system prompt here..."
                                        rows={8}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-300 dark:border-white/5 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all resize-none font-mono text-sm"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-gray-200 dark:border-white/5 flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowEditor(false);
                                    setEditingPrompt(null);
                                }}
                                className="px-6 py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={savePrompt}
                                disabled={!newPrompt.title || !newPrompt.content}
                                className="px-6 py-2.5 rounded-xl text-sm font-medium bg-brand-primary hover:bg-brand-primary-dark text-white transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {editingPrompt ? 'Save Changes' : 'Create Prompt'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
