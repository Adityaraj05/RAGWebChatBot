'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface EscalatedConversation {
    id: string;
    chatbot_id: string;
    chatbot_name: string;
    visitor_id: string;
    started_at: string;
    status: string;
    escalated_at: string;
    escalation_reason: string;
    page_url: string;
    message_count: number;
    last_message: string;
    has_unread: boolean;
}

interface Message {
    id: string;
    content: string;
    sender: string;
    sender_type: string;
    agent_name?: string;
    created_at: string;
}

export default function HumanSupportPage() {
    const [conversations, setConversations] = useState<EscalatedConversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<EscalatedConversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [replyText, setReplyText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('pending');
    const [agentName, setAgentName] = useState('Support Agent');

    // Fetch all conversations on mount and when filter changes
    useEffect(() => {
        fetchConversations();

        // Polling for new conversations
        const interval = setInterval(fetchConversations, 10000);
        return () => clearInterval(interval);
    }, [statusFilter]);

    async function fetchConversations() {
        try {
            const res = await fetch(`/api/human-support/conversations?status=${statusFilter}`);
            const data = await res.json();
            if (data.success) {
                setConversations(data.conversations);
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
        }
    }

    // Fetch messages when conversation selected (don't poll if resolved)
    useEffect(() => {
        if (!selectedConversation) return;
        fetchMessages();

        // Only poll for new messages if conversation is NOT resolved
        if (selectedConversation.status !== 'resolved') {
            const interval = setInterval(fetchMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [selectedConversation?.id, selectedConversation?.status]);

    async function fetchMessages() {
        if (!selectedConversation) return;
        try {
            const res = await fetch(
                `/api/human-support/messages?conversationId=${selectedConversation.id}`
            );
            const data = await res.json();
            if (data.success) {
                setMessages(data.messages);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    }

    async function sendReply() {
        if (!selectedConversation || !replyText.trim()) return;

        setSending(true);
        try {
            const res = await fetch('/api/human-support/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: selectedConversation.id,
                    content: replyText,
                    agentName
                })
            });

            const data = await res.json();
            if (data.success) {
                setReplyText('');
                fetchMessages();
                fetchConversations();
            }
        } catch (error) {
            console.error('Error sending reply:', error);
        } finally {
            setSending(false);
        }
    }

    async function updateStatus(newStatus: string) {
        if (!selectedConversation) return;

        try {
            await fetch('/api/human-support/reply', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: selectedConversation.id,
                    status: newStatus
                })
            });
            fetchConversations();
            setSelectedConversation(prev => prev ? { ...prev, status: newStatus } : null);
        } catch (error) {
            console.error('Error updating status:', error);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-brand-bg-white dark:bg-[#0A0A0A] flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-brand-primary border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-gray-50 dark:bg-[#0A0A0A] flex flex-col">
            {/* Header */}
            <header className="h-14 sm:h-16 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#111] flex items-center px-3 sm:px-6 gap-3 sm:gap-6 shrink-0">
                <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3 group shrink-0">
                    <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center group-hover:bg-brand-primary-dark transition-colors shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    </div>
                    <span className="font-bold text-base sm:text-lg text-brand-heading dark:text-white truncate">MyWebChat</span>
                </Link>
                <div className="h-6 sm:h-8 w-px bg-gray-200 dark:bg-white/10 hidden sm:block"></div>
                <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 truncate min-w-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <span className="truncate">Human Support</span>
                </h1>
                <div className="ml-auto flex items-center gap-2 sm:gap-4 shrink-0">
                    <label className="text-xs sm:text-sm text-gray-500 hidden md:inline">Agent Name:</label>
                    <input
                        type="text"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        className="px-2 sm:px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm w-24 sm:w-40"
                    />
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Conversations List - hidden on mobile when a conversation is selected */}
                <aside className={`w-full lg:w-96 border-r border-gray-200 dark:border-white/10 bg-white dark:bg-[#0A0A0A] flex flex-col shrink-0 ${selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
                    {/* Status Filter */}
                    <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-white/10">
                        <div className="flex flex-wrap gap-2">
                            {(['pending', 'in_progress', 'resolved', 'all'] as const).map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === status
                                        ? 'bg-brand-primary text-white'
                                        : 'bg-brand-bg-light dark:bg-white/5 text-brand-text dark:text-gray-400 hover:bg-brand-bg-white dark:hover:bg-white/10 hover:text-brand-heading'
                                        }`}
                                >
                                    {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Conversation List */}
                    <div className="flex-1 overflow-y-auto">
                        {conversations.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                No {statusFilter === 'all' ? '' : statusFilter} conversations
                            </div>
                        ) : (
                            conversations.map(conv => (
                                <div
                                    key={conv.id}
                                    onClick={() => setSelectedConversation(conv)}
                                    className={`p-4 border-b border-gray-100 dark:border-white/5 cursor-pointer transition-all ${selectedConversation?.id === conv.id
                                        ? 'bg-brand-primary/10 border-l-4 border-l-brand-primary'
                                        : 'hover:bg-brand-bg-light dark:hover:bg-white/5'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {conv.has_unread && (
                                                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                                            )}
                                            <span className="font-medium text-gray-900 dark:text-white text-sm">
                                                {conv.chatbot_name}
                                            </span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${conv.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' :
                                            conv.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                                                'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                                            }`}>
                                            {conv.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-2">
                                        {conv.last_message || 'No message preview'}
                                    </p>
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span className="truncate max-w-[60%]">{conv.escalation_reason}</span>
                                        <span>{new Date(conv.escalated_at).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </aside>

                {/* Chat View - hidden on mobile when no conversation selected */}
                <main className={`flex-1 flex flex-col bg-gray-50 dark:bg-[#0A0A0A] min-w-0 ${!selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
                    {!selectedConversation ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center text-gray-500">
                                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <p className="text-lg">Select a conversation to respond</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <div className="h-14 sm:h-16 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#111] px-3 sm:px-6 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <button type="button" onClick={() => setSelectedConversation(null)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 shrink-0" aria-label="Back to list">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <div className="min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2 truncate">
                                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded text-xs">
                                            {selectedConversation.chatbot_name}
                                        </span>
                                        Visitor: {selectedConversation.visitor_id.substring(0, 20)}...
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                        {selectedConversation.escalation_reason} • {selectedConversation.page_url || 'Unknown page'}
                                    </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {selectedConversation.status !== 'resolved' && (
                                        <button
                                            onClick={() => updateStatus('resolved')}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 transition-colors"
                                        >
                                            Mark Resolved
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {messages.map(msg => (
                                    <div
                                        key={msg.id}
                                        className={`max-w-[70%] ${msg.sender === 'user' ? 'ml-auto' : 'mr-auto'}`}
                                    >
                                        <div className={`rounded-2xl px-4 py-3 ${msg.sender === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : msg.sender_type === 'human_agent'
                                                ? 'bg-orange-500 text-white'
                                                : 'bg-gray-200 dark:bg-[#1A1A1A] text-gray-900 dark:text-white'
                                            }`}>
                                            {msg.sender_type === 'human_agent' && (
                                                <div className="text-xs opacity-75 mb-1">
                                                    Agent: {msg.agent_name || 'Support'}
                                                </div>
                                            )}
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                        <div className={`text-xs text-gray-500 mt-1 ${msg.sender === 'user' ? 'text-right' : ''}`}>
                                            {new Date(msg.created_at).toLocaleTimeString()}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Reply Input - only show for non-resolved conversations */}
                            {selectedConversation.status === 'resolved' ? (
                                <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#111] text-center">
                                    <span className="text-sm text-gray-500">
                                        ✓ This conversation has been resolved
                                    </span>
                                </div>
                            ) : (
                                <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#111]">
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && sendReply()}
                                            placeholder="Type your reply..."
                                            className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                        />
                                        <button
                                            onClick={sendReply}
                                            disabled={sending || !replyText.trim()}
                                            className="px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {sending ? 'Sending...' : 'Send'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
