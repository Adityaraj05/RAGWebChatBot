import Link from 'next/link';

export default function PricingPage() {
    const plans = [
        {
            name: 'Basic',
            docs: '10 documents',
            price: '$0',
            features: [
                'Basic support',
                'Standard processing speed',
                'Email support'
            ],
            recommended: false
        },
        {
            name: 'Pro',
            docs: '15 documents',
            price: '$29',
            features: [
                'Priority support',
                'Fast processing speed',
                'Email & Chat support',
                'Advanced analytics'
            ],
            recommended: true
        },
        {
            name: 'Enterprise',
            docs: '20 documents',
            price: '$49',
            features: [
                '24/7 Dedicated support',
                'Ultra fast processing',
                'Phone support',
                'Custom integrations'
            ],
            recommended: false
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] text-white selection:bg-blue-500/30">
            {/* Navbar */}
            <nav className="border-b border-white/10 backdrop-blur-md sticky top-0 z-50 bg-gray-50 dark:bg-[#0A0A0A]/80">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </div>
                            <span className="font-bold text-lg tracking-tight">MyWebChat</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link href="/dashboard" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                            Dashboard
                        </Link>
                        <Link
                            href="/create"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-all"
                        >
                            Create Chatbot
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="p-4 sm:p-6 lg:p-12">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-8 sm:mb-12">
                        <h1 className="text-3xl sm:text-4xl font-bold mb-2 sm:mb-4">Pricing Plans</h1>
                        <p className="text-gray-400 text-sm sm:text-base">Choose the perfect plan for your needs</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {plans.map((plan) => (
                            <div
                                key={plan.name}
                                className={`relative p-6 sm:p-8 rounded-2xl border ${plan.recommended
                                        ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-500/20'
                                        : 'bg-white dark:bg-[#111] border-gray-200 dark:border-white/5 hover:border-white/10'
                                    } transition-all duration-300 transform hover:-translate-y-1`}
                            >
                                {plan.recommended && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                        Most Popular
                                    </div>
                                )}

                                <div className="text-center mb-8">
                                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                                    <div className="text-3xl font-bold mb-1">{plan.price}<span className="text-base text-gray-500 font-normal">/mo</span></div>
                                    <div className="text-blue-400 font-medium">{plan.docs}</div>
                                </div>

                                <ul className="space-y-4 mb-8">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-3 text-sm text-gray-300">
                                            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <button className={`w-full py-3 rounded-xl font-medium transition-all ${plan.recommended
                                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                        : 'bg-white/5 hover:bg-white/10 text-white hover:text-white'
                                    }`}>
                                    Get Started
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
