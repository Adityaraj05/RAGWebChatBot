'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PricingPlan {
    id: string;
    name: string;
    price: string;
    period: string;
    description: string;
    features: string[];
    isPopular: boolean;
}

const DEFAULT_PLANS: PricingPlan[] = [
    {
        id: 'basic',
        name: 'Basic',
        price: '$29',
        period: '/month',
        description: 'Perfect for small businesses getting started',
        features: ['1,000 messages/month', '1 chatbot', 'Email support', 'Basic analytics'],
        isPopular: false
    },
    {
        id: 'pro',
        name: 'Pro',
        price: '$79',
        period: '/month',
        description: 'For growing businesses with higher demands',
        features: ['10,000 messages/month', '5 chatbots', 'Priority support', 'Advanced analytics', 'Custom branding'],
        isPopular: true
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: '$199',
        period: '/month',
        description: 'For large organizations with custom needs',
        features: ['Unlimited messages', 'Unlimited chatbots', '24/7 support', 'Custom integrations', 'SLA guarantee', 'Dedicated manager'],
        isPopular: false
    }
];

export default function PricingPlansPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [plans, setPlans] = useState<PricingPlan[]>(DEFAULT_PLANS);
    const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const savedPlans = localStorage.getItem('pricingPlans');
        if (savedPlans) {
            setPlans(JSON.parse(savedPlans));
        }
    }, []);

    const savePlans = (updatedPlans: PricingPlan[]) => {
        setPlans(updatedPlans);
        localStorage.setItem('pricingPlans', JSON.stringify(updatedPlans));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const updatePlan = (planId: string, field: keyof PricingPlan, value: string | string[] | boolean) => {
        const updated = plans.map(p => p.id === planId ? { ...p, [field]: value } : p);
        savePlans(updated);
    };

    const updateFeature = (planId: string, index: number, value: string) => {
        const updated = plans.map(p => {
            if (p.id === planId) {
                const newFeatures = [...p.features];
                newFeatures[index] = value;
                return { ...p, features: newFeatures };
            }
            return p;
        });
        savePlans(updated);
    };

    const addFeature = (planId: string) => {
        const updated = plans.map(p => {
            if (p.id === planId) {
                return { ...p, features: [...p.features, 'New feature'] };
            }
            return p;
        });
        savePlans(updated);
    };

    const removeFeature = (planId: string, index: number) => {
        const updated = plans.map(p => {
            if (p.id === planId) {
                const newFeatures = p.features.filter((_, i) => i !== index);
                return { ...p, features: newFeatures };
            }
            return p;
        });
        savePlans(updated);
    };

    const addNewPlan = () => {
        const newPlan: PricingPlan = {
            id: `plan-${Date.now()}`,
            name: 'New Plan',
            price: '$0',
            period: '/month',
            description: 'Describe this plan',
            features: ['Feature 1'],
            isPopular: false
        };
        savePlans([...plans, newPlan]);
    };

    const deletePlan = (planId: string) => {
        const updated = plans.filter(p => p.id !== planId);
        savePlans(updated);
    };

    const resetToDefaults = () => {
        savePlans(DEFAULT_PLANS);
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
                    <Link href="/gallery" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-all" onClick={() => setSidebarOpen(false)}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Prompt Gallery
                    </Link>
                    <Link href="/pricing-plans" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20" onClick={() => setSidebarOpen(false)}>
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
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Pricing Plans</h1>
                            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Configure pricing tiers for your chatbot service.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                        {saved && (
                            <div className="px-4 py-2 bg-green-500/20 text-green-600 dark:text-green-400 rounded-xl flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Saved!
                            </div>
                        )}
                        <button
                            onClick={resetToDefaults}
                            className="px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all"
                        >
                            Reset to Defaults
                        </button>
                        <button
                            onClick={addNewPlan}
                            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-dark text-white font-medium rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-brand-primary/20"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Plan
                        </button>
                    </div>
                </header>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map(plan => (
                        <div
                            key={plan.id}
                            className={`relative group bg-white dark:bg-[#111] border rounded-2xl p-6 flex flex-col ${plan.isPopular
                                ? 'border-brand-primary ring-2 ring-brand-primary/20'
                                : 'border-gray-200 dark:border-white/5'
                                }`}
                        >
                            {plan.isPopular && (
                                <div className="bg-brand-primary text-white text-xs font-semibold px-3 py-1 rounded-full w-fit mb-4">
                                    Most Popular
                                </div>
                            )}

                            {/* Delete Plan Button */}
                            <button
                                onClick={() => deletePlan(plan.id)}
                                className="absolute top-4 right-4 p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete Plan"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>

                            {/* Plan Name */}
                            <div className="mb-4">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Plan Name</label>
                                <input
                                    type="text"
                                    value={plan.name}
                                    onChange={e => updatePlan(plan.id, 'name', e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-300 dark:border-white/5 rounded-lg text-lg font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Price */}
                            <div className="flex gap-2 mb-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Price</label>
                                    <input
                                        type="text"
                                        value={plan.price}
                                        onChange={e => updatePlan(plan.id, 'price', e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-300 dark:border-white/5 rounded-lg text-2xl font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Period</label>
                                    <input
                                        type="text"
                                        value={plan.period}
                                        onChange={e => updatePlan(plan.id, 'period', e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-300 dark:border-white/5 rounded-lg text-gray-600 dark:text-gray-400 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div className="mb-4">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
                                <input
                                    type="text"
                                    value={plan.description}
                                    onChange={e => updatePlan(plan.id, 'description', e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-300 dark:border-white/5 rounded-lg text-sm text-gray-600 dark:text-gray-400 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Popular Toggle */}
                            <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                                <span className="text-sm text-gray-700 dark:text-gray-300">Mark as Popular</span>
                                <button
                                    onClick={() => updatePlan(plan.id, 'isPopular', !plan.isPopular)}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${plan.isPopular ? 'bg-blue-600' : 'bg-gray-300 dark:bg-white/10'
                                        }`}
                                >
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${plan.isPopular ? 'translate-x-6' : ''
                                        }`}></div>
                                </button>
                            </div>

                            {/* Features */}
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Features</label>
                                <div className="space-y-2">
                                    {plan.features.map((feature, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={feature}
                                                onChange={e => updateFeature(plan.id, index, e.target.value)}
                                                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-[#0A0A0A] border border-gray-300 dark:border-white/5 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                            />
                                            <button
                                                onClick={() => removeFeature(plan.id, index)}
                                                className="px-2 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => addFeature(plan.id)}
                                        className="w-full py-2 text-sm text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors flex items-center justify-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Feature
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
