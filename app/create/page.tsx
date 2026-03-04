'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import Link from 'next/link';
import { PROMPT_GALLERY, PromptTemplate } from '@/lib/prompts';

interface ModelInfo {
    id: string;
    name: string;
    desc: string;
    badge?: string;
}

interface Provider {
    value: string;
    label: string;
    desc: string;
    models: ModelInfo[];
}

const PROVIDERS: Provider[] = [
    {
        value: 'openai',
        label: 'OpenAI (GPT)',
        desc: 'Best for general purpose tasks, creative writing, and reasoning.',
        models: [
            { id: 'gpt-4o', name: 'GPT-4o', desc: 'Most capable model. Best for complex tasks requiring deep understanding.', badge: 'Recommended' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Fast & affordable. Great balance of speed and quality for most use cases.', badge: 'Best Value' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', desc: 'High performance with vision capabilities. Good for detailed analysis.' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', desc: 'Budget-friendly option. Suitable for simple Q&A and basic support.', badge: 'Budget' }
        ]
    },
    {
        value: 'anthropic',
        label: 'Anthropic (Claude)',
        desc: 'Excellent for nuance, long context, and complex instructions.',
        models: [
            { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', desc: 'Latest & most intelligent. Ideal for complex reasoning and detailed analysis.', badge: 'Newest' },
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', desc: 'Excellent balance of intelligence and speed. Great for most business tasks.', badge: 'Recommended' },
            { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', desc: 'Fastest Claude model. Perfect for quick responses and high-volume chats.', badge: 'Fastest' }
        ]
    },
    {
        value: 'google',
        label: 'Google (Gemini)',
        desc: 'Fast, cost-effective, and great for processing large amounts of data.',
        models: [
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Ultra-fast responses. Best for real-time chat with minimal latency.', badge: 'Fastest' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: 'Most capable Gemini. Excellent for complex reasoning and analysis.', badge: 'Recommended' },
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', desc: 'Balanced speed and capability. Good for general-purpose chatbots.' }
        ]
    }
];

const FOCUS_OPTIONS = ['Lead Nurture', 'FAQs', 'Customer Support', 'Pricing Estimate', 'All of the above'];
const TONE_OPTIONS = ['Professional', 'Warm & Empathetic', 'Friendly & Casual', 'Other'];

const PLANS = [
    { id: 'basic', name: 'Basic', limit: 'Supports 10 documents' },
    { id: 'pro', name: 'Pro', limit: 'Supports 15 documents' },
    { id: 'enterprise', name: 'Enterprise', limit: 'Supports 20 documents' }
];

export default function CreatePage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showGallery, setShowGallery] = useState(false);

    // Initial State
    const [form, setForm] = useState({
        name: '',
        plan: 'basic',
        context: '', // Domain/Industry
        focus: 'All of the above',
        tone: 'Professional',
        tone_custom: '',
        primary_color: '#3B82F6',
        welcome_message: 'Hi! 👋 How can I help you today?',

        llm_provider: 'openai',
        api_key: '',
        model_name: 'gpt-4o-mini',
        system_prompt: '',

        // Widget Customization
        widget_position: 'bottom-right',
        widget_size: 'medium',
        button_shape: 'circle',
        widget_width: 380,
        widget_height: 520,
        font_family: 'Inter',
        header_style: 'solid',
        bubble_style: 'modern',
        secondary_color: '#8B5CF6',
        theme: 'dark',
        show_avatar: true,
        header_subtitle: 'Powered by AI',
    });

    const currentProvider = PROVIDERS.find(p => p.value === form.llm_provider);

    // Auto-generate system prompt when moving to Step 2
    const handleNextStep = () => {
        if (step === 1) {
            if (!form.name || !form.context) {
                setError('Please fill in all required fields.');
                return;
            }
            setError('');

            // Generate draft prompt if empty
            if (!form.system_prompt) {
                const selectedTone = form.tone === 'Other' ? form.tone_custom : form.tone;
                const draft = `You are a ${selectedTone.toLowerCase()} AI assistant for a ${form.context} company.
Your primary focus is: ${form.focus}.
${form.focus === 'Lead Nurture' ? 'Help qualifiy leads by asking polite questions about their needs.' : ''}
${form.focus === 'FAQs' ? 'Answer common questions clearly and concisely.' : ''}
${form.focus === 'Customer Support' ? 'Troubleshoot issues and guide users to solutions.' : ''}
${form.focus === 'Pricing Estimate' ? 'Provide rough estimates based on user requirements but clarify they are estimates.' : ''}
${form.focus === 'All of the above' ? 'Handle inquiries about services, pricing, and support with a helpful attitude.' : ''}

Always remain polite and helpful. If you don't know an answer, suggest contacting human support.`;

                setForm(prev => ({ ...prev, system_prompt: draft }));
            }
            setStep(2);
        } else if (step === 2) {
            if (!form.api_key) {
                setError('Please provide your API key.');
                return;
            }
            setError('');
            setStep(3);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/chatbots/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    plan: form.plan,
                    llm_provider: form.llm_provider,
                    api_key: form.api_key,
                    model_name: form.model_name,
                    system_prompt: form.system_prompt,
                    primary_color: form.primary_color,
                    welcome_message: form.welcome_message,
                    embed_code: `cb_${nanoid(12)}`,
                    // Widget Customization
                    widget_position: form.widget_position,
                    widget_size: form.widget_size,
                    button_shape: form.button_shape,
                    widget_width: form.widget_width,
                    widget_height: form.widget_height,
                    font_family: form.font_family,
                    header_style: form.header_style,
                    bubble_style: form.bubble_style,
                    secondary_color: form.secondary_color,
                    theme: form.theme,
                    show_avatar: form.show_avatar,
                    header_subtitle: form.header_subtitle,
                })
            });

            const data = await res.json();

            if (data.success) {
                router.push(`/chatbot/${data.chatbot.id}`);
            } else {
                setError(data.error || 'Failed to create chatbot');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-bg-white dark:bg-[#0A0A0A] text-brand-text dark:text-white selection:bg-brand-primary/30 py-6 sm:py-12 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <Link href="/dashboard" className="inline-flex items-center text-brand-gray-muted hover:text-brand-heading transition-colors mb-4 text-sm">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Home
                        </Link>
                        <h1 className="text-2xl sm:text-3xl font-bold text-brand-heading">Create Chatbot</h1>
                        <p className="text-brand-gray-muted">
                            Step {step} of 3: {step === 1 ? 'Basic Info & Branding' : step === 2 ? 'Intelligence & Settings' : 'Widget Customization'}
                        </p>
                    </div>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-4 mb-8 max-w-md mx-auto">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${step >= s
                                ? 'bg-brand-primary text-white'
                                : 'bg-brand-bg-light dark:bg-white/10 text-brand-text'
                                }`}>
                                {step > s ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : s}
                            </div>
                            {s < 3 && (
                                <div className={`w-16 h-1 rounded-full ${step > s ? 'bg-brand-primary' : 'bg-brand-bg-light dark:bg-white/10'}`}></div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Main Form */}
                <div className="bg-brand-bg-white border border-brand-bg-light dark:border-white/5 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl relative">
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {step === 1 ? (
                        /* STAGE 1 */
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-muted mb-2">Chatbot Name *</label>
                                    <input
                                        type="text"
                                        placeholder="My Support Bot"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-brand-bg-light/50 dark:bg-[#1A1A1A] border border-brand-bg-light dark:border-white/5 rounded-xl text-brand-heading dark:text-white focus:ring-2 focus:ring-brand-primary transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-muted mb-2">Business Domain / Context *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. We are a boutique real estate agency helping first-time buyers in Seattle."
                                        value={form.context}
                                        onChange={e => setForm({ ...form, context: e.target.value })}
                                        className="w-full px-4 py-3 bg-brand-bg-light/50 dark:bg-[#1A1A1A] border border-brand-bg-light dark:border-white/5 rounded-xl text-brand-heading dark:text-white focus:ring-2 focus:ring-brand-primary transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-brand-gray-muted mb-3">Select Pricing Plan</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {PLANS.map(plan => (
                                        <div
                                            key={plan.id}
                                            onClick={() => setForm({ ...form, plan: plan.id })}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all ${form.plan === plan.id
                                                ? 'bg-brand-primary/10 border-brand-primary'
                                                : 'bg-brand-bg-light/50 dark:bg-[#1A1A1A] border-brand-bg-light dark:border-white/5 hover:border-brand-primary/20'
                                                }`}
                                        >
                                            <div className={`font-semibold mb-1 ${form.plan === plan.id ? 'text-brand-primary' : 'text-brand-gray-muted'}`}>{plan.name}</div>
                                            <div className="text-xs text-brand-gray-muted">{plan.limit}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-brand-gray-muted mb-3">Primary Focus</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {FOCUS_OPTIONS.map(opt => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setForm({ ...form, focus: opt })}
                                            className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all text-left ${form.focus === opt
                                                ? 'bg-brand-secondary/10 border-brand-secondary text-brand-secondary'
                                                : 'bg-brand-bg-light/50 dark:bg-[#1A1A1A] border-brand-bg-light dark:border-white/5 text-brand-gray-secondary hover:border-brand-secondary/20'
                                                }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-brand-gray-muted mb-3">Tone of Voice</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {TONE_OPTIONS.map(opt => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setForm({ ...form, tone: opt })}
                                            className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all text-center ${form.tone === opt
                                                ? 'bg-brand-secondary/10 border-brand-secondary text-brand-secondary'
                                                : 'bg-brand-bg-light/50 dark:bg-[#1A1A1A] border-brand-bg-light dark:border-white/5 text-brand-gray-secondary hover:border-brand-secondary/20'
                                                }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                                {form.tone === 'Other' && (
                                    <div className="mt-3">
                                        <input
                                            type="text"
                                            placeholder="Describe tone (e.g. Sarcastic, Witty)"
                                            value={form.tone_custom}
                                            onChange={e => setForm({ ...form, tone_custom: e.target.value })}
                                            className="w-full px-4 py-3 bg-brand-bg-light/50 dark:bg-[#1A1A1A] border border-brand-bg-light dark:border-white/5 rounded-xl text-brand-heading dark:text-white focus:ring-2 focus:ring-brand-primary transition-all"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-muted mb-2">Primary Color</label>
                                    <div className="flex items-center gap-2 bg-brand-bg-light/50 dark:bg-[#1A1A1A] border border-brand-bg-light dark:border-white/5 rounded-xl p-1 pr-3">
                                        <input
                                            type="color"
                                            value={form.primary_color}
                                            onChange={e => setForm({ ...form, primary_color: e.target.value })}
                                            className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"
                                        />
                                        <span className="text-sm font-mono text-brand-gray-muted uppercase">{form.primary_color}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-muted mb-2">Welcome Message</label>
                                    <input
                                        type="text"
                                        value={form.welcome_message}
                                        onChange={e => setForm({ ...form, welcome_message: e.target.value })}
                                        className="w-full px-4 py-3 bg-brand-bg-light/50 dark:bg-[#1A1A1A] border border-brand-bg-light dark:border-white/5 rounded-xl text-brand-heading dark:text-white focus:ring-2 focus:ring-brand-primary transition-all"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    onClick={handleNextStep}
                                    className="px-8 py-3 bg-brand-primary hover:bg-brand-primary-dark text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-primary/20 flex items-center gap-2"
                                >
                                    Next Step
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ) : step === 2 ? (
                        /* STAGE 2 */
                        <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="block text-sm font-medium text-brand-gray-muted mb-4">Select LLM Provider</label>
                                <div className="grid gap-4">
                                    {PROVIDERS.map(p => (
                                        <label
                                            key={p.value}
                                            className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${form.llm_provider === p.value
                                                ? 'bg-brand-secondary/10 border-brand-secondary'
                                                : 'bg-brand-bg-light/50 dark:bg-[#1A1A1A] border-brand-bg-light dark:border-white/5 hover:border-brand-secondary/20'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="provider"
                                                value={p.value}
                                                checked={form.llm_provider === p.value}
                                                onChange={() => setForm({ ...form, llm_provider: p.value, model_name: p.models[0].id })}
                                                className="mt-1"
                                            />
                                            <div>
                                                <div className={`font-semibold ${form.llm_provider === p.value ? 'text-white' : 'text-brand-gray-muted'}`}>{p.label}</div>
                                                <div className="text-sm text-brand-gray-muted mt-1">{p.desc}</div>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {p.models.slice(0, 2).map(m => (
                                                        <span key={m.id} className="px-2 py-1 rounded bg-black/20 text-xs text-brand-gray-muted font-mono border border-brand-bg-light dark:border-white/5">{m.name}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Model Selection with Descriptions */}
                            <div>
                                <label className="block text-sm font-medium text-brand-gray-muted mb-3">Select Model</label>
                                <div className="grid gap-3">
                                    {currentProvider?.models.map(model => (
                                        <div
                                            key={model.id}
                                            onClick={() => setForm({ ...form, model_name: model.id })}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all ${form.model_name === model.id
                                                ? 'bg-brand-secondary/10 border-brand-secondary shadow-lg shadow-brand-secondary/10'
                                                : 'bg-brand-bg-light/50 dark:bg-[#1A1A1A] border-brand-bg-light dark:border-white/5 hover:border-brand-secondary/20 hover:bg-brand-secondary/5'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.model_name === model.id
                                                        ? 'border-brand-secondary bg-brand-secondary'
                                                        : 'border-brand-gray-muted'
                                                        }`}>
                                                        {form.model_name === model.id && (
                                                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className={`font-semibold ${form.model_name === model.id ? 'text-brand-secondary dark:text-white' : 'text-brand-gray-muted'}`}>
                                                            {model.name}
                                                        </div>
                                                        <div className="text-sm text-brand-gray-muted mt-0.5">{model.desc}</div>
                                                    </div>
                                                </div>
                                                {model.badge && (
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${model.badge === 'Recommended' ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30' :
                                                        model.badge === 'Best Value' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                                            model.badge === 'Fastest' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                                                                model.badge === 'Newest' ? 'bg-brand-secondary/20 text-brand-secondary border border-brand-secondary/30' :
                                                                    'bg-brand-gray-muted/20 text-brand-gray-muted border border-brand-gray-muted/30'
                                                        }`}>
                                                        {model.badge}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* API Key */}
                            <div>
                                <label className="block text-sm font-medium text-brand-gray-muted mb-2">API Key</label>
                                <input
                                    type="password"
                                    placeholder="sk-..."
                                    value={form.api_key}
                                    onChange={e => setForm({ ...form, api_key: e.target.value })}
                                    className="w-full px-4 py-3 bg-brand-bg-light/50 dark:bg-[#1A1A1A] border border-brand-bg-light dark:border-white/5 rounded-xl text-brand-heading dark:text-white font-mono text-sm focus:ring-2 focus:ring-brand-primary transition-all"
                                    required
                                />
                                <p className="text-xs text-brand-gray-muted mt-2">Your API key is encrypted and stored securely.</p>
                            </div>

                            <div className="relative">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-medium text-brand-gray-muted">System Prompt</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowGallery(true)}
                                        className="text-xs text-brand-secondary hover:text-brand-secondary-light flex items-center gap-1"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                        Browse Gallery
                                    </button>
                                </div>
                                <textarea
                                    value={form.system_prompt}
                                    onChange={e => setForm({ ...form, system_prompt: e.target.value })}
                                    className="w-full px-4 py-3 bg-brand-bg-light/50 dark:bg-[#1A1A1A] border border-brand-bg-light dark:border-white/5 rounded-xl text-brand-heading dark:text-white focus:ring-2 focus:ring-brand-primary transition-all min-h-[150px] leading-relaxed"
                                    placeholder="Enter instructions for the AI..."
                                />
                            </div>

                            <div className="pt-4 flex justify-between">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="px-6 py-3 text-brand-gray-muted hover:text-brand-heading transition-colors font-medium flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNextStep}
                                    className="px-8 py-3 bg-brand-primary hover:bg-brand-primary-dark text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-primary/20 flex items-center gap-2"
                                >
                                    Next: Customize Widget
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* STAGE 3 - Widget Customization */
                        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="grid lg:grid-cols-2 gap-8">
                                {/* Customization Options */}
                                <div className="space-y-6">
                                    {/* Position & Size */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-brand-heading mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-brand-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                            </svg>
                                            Position & Layout
                                        </h3>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Widget Position</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {['bottom-right', 'bottom-left'].map(pos => (
                                                        <button
                                                            key={pos}
                                                            type="button"
                                                            onClick={() => setForm({ ...form, widget_position: pos })}
                                                            className={`p-3 rounded-xl border text-sm font-medium transition-all ${form.widget_position === pos
                                                                ? 'bg-brand-secondary/10 border-brand-secondary text-brand-secondary'
                                                                : 'bg-brand-bg-light/50 dark:bg-[#1A1A1A] border-brand-bg-light dark:border-white/5 text-brand-gray-secondary hover:border-brand-secondary/20'
                                                                }`}
                                                        >
                                                            {pos === 'bottom-right' ? '↘ Bottom Right' : '↙ Bottom Left'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Button Shape</label>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {['circle', 'rounded', 'square'].map(shape => (
                                                        <button
                                                            key={shape}
                                                            type="button"
                                                            onClick={() => setForm({ ...form, button_shape: shape })}
                                                            className={`p-3 rounded-xl border text-sm font-medium transition-all capitalize ${form.button_shape === shape
                                                                ? 'bg-brand-secondary/10 border-brand-secondary text-brand-secondary'
                                                                : 'bg-brand-bg-light/50 dark:bg-[#1A1A1A] border-brand-bg-light dark:border-white/5 text-brand-gray-secondary hover:border-brand-secondary/20'
                                                                }`}
                                                        >
                                                            {shape}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Widget Size</label>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {['small', 'medium', 'large'].map(size => (
                                                        <button
                                                            key={size}
                                                            type="button"
                                                            onClick={() => setForm({ ...form, widget_size: size })}
                                                            className={`p-3 rounded-xl border text-sm font-medium transition-all capitalize ${form.widget_size === size
                                                                ? 'bg-brand-secondary/10 border-brand-secondary text-brand-secondary'
                                                                : 'bg-brand-bg-light/50 dark:bg-[#1A1A1A] border-brand-bg-light dark:border-white/5 text-brand-gray-secondary hover:border-brand-secondary/20'
                                                                }`}
                                                        >
                                                            {size}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Colors & Theme */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-brand-heading mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                            </svg>
                                            Colors & Theme
                                        </h3>

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm text-brand-gray-muted mb-2">Primary Color</label>
                                                    <div className="flex items-center gap-2 bg-brand-bg-light/50 dark:bg-[#1A1A1A] border border-brand-bg-light dark:border-white/5 rounded-xl p-2">
                                                        <input
                                                            type="color"
                                                            value={form.primary_color}
                                                            onChange={e => setForm({ ...form, primary_color: e.target.value })}
                                                            className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"
                                                        />
                                                        <span className="text-sm font-mono text-brand-gray-muted">{form.primary_color}</span>
                                                    </div>
                                                </div>
                                                {form.header_style === 'gradient' && (
                                                    <div>
                                                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Secondary Color (Gradient)</label>
                                                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/5 rounded-xl p-2">
                                                            <input
                                                                type="color"
                                                                value={form.secondary_color}
                                                                onChange={e => setForm({ ...form, secondary_color: e.target.value })}
                                                                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"
                                                            />
                                                            <span className="text-sm font-mono text-gray-600 dark:text-gray-400">{form.secondary_color}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Theme</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {['dark', 'light'].map(t => (
                                                        <button
                                                            key={t}
                                                            type="button"
                                                            onClick={() => setForm({ ...form, theme: t })}
                                                            className={`p-3 rounded-xl border text-sm font-medium transition-all capitalize flex items-center justify-center gap-2 ${form.theme === t
                                                                ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                                                : 'bg-gray-100 dark:bg-[#1A1A1A] border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:border-white/20'
                                                                }`}
                                                        >
                                                            {t === 'dark' ? '🌙' : '☀️'} {t} Mode
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Typography & Style */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-brand-heading dark:text-white mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
                                            </svg>
                                            Typography & Style
                                        </h3>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Font Family</label>
                                                <select
                                                    value={form.font_family}
                                                    onChange={e => setForm({ ...form, font_family: e.target.value })}
                                                    className="w-full px-4 py-3 bg-brand-bg-light/50 dark:bg-[#1A1A1A] border border-brand-bg-light dark:border-white/5 rounded-xl text-brand-heading dark:text-white"
                                                >
                                                    <option value="Inter">Inter (Modern)</option>
                                                    <option value="Roboto">Roboto (Clean)</option>
                                                    <option value="Poppins">Poppins (Friendly)</option>
                                                    <option value="Montserrat">Montserrat (Bold)</option>
                                                    <option value="System">System Default</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Header Style</label>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {['solid', 'gradient', 'transparent'].map(style => (
                                                        <button
                                                            key={style}
                                                            type="button"
                                                            onClick={() => setForm({ ...form, header_style: style })}
                                                            className={`p-3 rounded-xl border text-sm font-medium transition-all capitalize ${form.header_style === style
                                                                ? 'bg-brand-secondary/10 border-brand-secondary text-brand-secondary'
                                                                : 'bg-brand-bg-light/50 dark:bg-[#1A1A1A] border-brand-bg-light dark:border-white/5 text-brand-gray-secondary hover:border-brand-secondary/20'
                                                                }`}
                                                        >
                                                            {style}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Message Bubble Style</label>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {['modern', 'rounded', 'square'].map(style => (
                                                        <button
                                                            key={style}
                                                            type="button"
                                                            onClick={() => setForm({ ...form, bubble_style: style })}
                                                            className={`p-3 rounded-xl border text-sm font-medium transition-all capitalize ${form.bubble_style === style
                                                                ? 'bg-brand-secondary/10 border-brand-secondary text-brand-secondary'
                                                                : 'bg-brand-bg-light/50 dark:bg-[#1A1A1A] border-brand-bg-light dark:border-white/5 text-brand-gray-secondary hover:border-brand-secondary/20'
                                                                }`}
                                                        >
                                                            {style}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Header Subtitle</label>
                                                <input
                                                    type="text"
                                                    value={form.header_subtitle}
                                                    onChange={e => setForm({ ...form, header_subtitle: e.target.value })}
                                                    className="w-full px-4 py-3 bg-brand-bg-light/50 dark:bg-[#1A1A1A] border border-brand-bg-light dark:border-white/5 rounded-xl text-brand-heading dark:text-white"
                                                    placeholder="Powered by AI"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Live Preview */}
                                <div className="lg:sticky lg:top-8">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        Live Preview
                                    </h3>

                                    <div className={`relative rounded-2xl p-6 min-h-[500px] ${form.theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
                                        {/* Preview Widget Panel */}
                                        <div
                                            className="absolute bottom-20 right-4 shadow-2xl overflow-hidden"
                                            style={{
                                                width: form.widget_size === 'small' ? '320px' : form.widget_size === 'large' ? '420px' : '380px',
                                                borderRadius: form.bubble_style === 'square' ? '8px' : form.bubble_style === 'rounded' ? '24px' : '16px',
                                                fontFamily: form.font_family === 'System' ? 'system-ui' : form.font_family,
                                            }}
                                        >
                                            {/* Header */}
                                            <div
                                                className="p-4 text-white"
                                                style={{
                                                    background: form.header_style === 'gradient'
                                                        ? `linear-gradient(135deg, ${form.primary_color}, ${form.secondary_color})`
                                                        : form.header_style === 'transparent'
                                                            ? 'rgba(0,0,0,0.3)'
                                                            : form.primary_color,
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L1 23l6.71-1.97C9.02 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold">{form.name || 'Chat Assistant'}</div>
                                                        <div className="text-sm opacity-80">{form.header_subtitle}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Messages Area */}
                                            <div className={`p-4 space-y-3 ${form.theme === 'dark' ? 'bg-gray-50 dark:bg-[#0A0A0A]' : 'bg-white'}`} style={{ minHeight: '200px' }}>
                                                <div
                                                    className={`max-w-[80%] p-3 ${form.theme === 'dark' ? 'bg-gray-100 dark:bg-[#1A1A1A] text-gray-200' : 'bg-gray-100 text-gray-800'}`}
                                                    style={{
                                                        borderRadius: form.bubble_style === 'square' ? '4px' : form.bubble_style === 'rounded' ? '20px' : '16px',
                                                    }}
                                                >
                                                    {form.welcome_message || 'Hi! 👋 How can I help you today?'}
                                                </div>
                                                <div
                                                    className="max-w-[80%] ml-auto p-3 text-white"
                                                    style={{
                                                        backgroundColor: form.primary_color,
                                                        borderRadius: form.bubble_style === 'square' ? '4px' : form.bubble_style === 'rounded' ? '20px' : '16px',
                                                    }}
                                                >
                                                    Hello! I need some help.
                                                </div>
                                            </div>

                                            {/* Input Area */}
                                            <div className={`p-4 border-t ${form.theme === 'dark' ? 'bg-white dark:bg-[#111] border-white/10' : 'bg-white border-gray-200'}`}>
                                                <div className="flex gap-2">
                                                    <div className={`flex-1 px-4 py-2 rounded-full ${form.theme === 'dark' ? 'bg-gray-100 dark:bg-[#1A1A1A] text-gray-600 dark:text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                                        Type a message...
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                                                        style={{ backgroundColor: form.primary_color }}
                                                    >
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Preview Button */}
                                        <button
                                            type="button"
                                            className={`absolute bottom-4 right-4 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110`}
                                            style={{
                                                backgroundColor: form.primary_color,
                                                width: form.widget_size === 'small' ? '50px' : form.widget_size === 'large' ? '70px' : '60px',
                                                height: form.widget_size === 'small' ? '50px' : form.widget_size === 'large' ? '70px' : '60px',
                                                borderRadius: form.button_shape === 'circle' ? '50%' : form.button_shape === 'rounded' ? '16px' : '8px',
                                            }}
                                        >
                                            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L1 23l6.71-1.97C9.02 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-between">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="px-6 py-3 text-brand-gray-muted hover:text-brand-heading transition-colors font-medium flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-3 bg-brand-primary hover:bg-brand-primary-dark text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            Create Chatbot
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                    {/* Gallery Modal */}
                    {showGallery && (
                        <div className="absolute inset-0 z-50 bg-white dark:bg-[#111] bg-opacity-95 backdrop-blur-sm rounded-2xl flex flex-col p-6 animate-in fade-in duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-brand-heading">Prompt Gallery</h3>
                                <button onClick={() => setShowGallery(false)} className="text-brand-gray-muted hover:text-brand-heading">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                                {PROMPT_GALLERY.map(t => (
                                    <div key={t.id} className="p-4 border border-brand-bg-light dark:border-white/10 rounded-xl hover:border-brand-secondary/50 hover:bg-white/5 transition-all cursor-pointer"
                                        onClick={() => {
                                            setForm({ ...form, system_prompt: t.content });
                                            setShowGallery(false);
                                        }}>
                                        <div className="text-xs text-brand-secondary font-semibold uppercase mb-1">{t.category}</div>
                                        <div className="font-bold text-brand-heading mb-2">{t.title}</div>
                                        <p className="text-sm text-brand-gray-muted line-clamp-2">{t.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
