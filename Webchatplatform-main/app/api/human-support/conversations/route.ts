import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - List conversations requiring human support from ALL chatbots
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') || 'all';

        let query = supabaseAdmin
            .from('conversations')
            .select(`
                id,
                chatbot_id,
                visitor_id,
                started_at,
                human_support_status,
                escalated_at,
                escalation_reason,
                page_url,
                chatbots (
                    name
                ),
                messages (
                    id,
                    content,
                    sender,
                    sender_type,
                    created_at
                )
            `)
            .eq('requires_human_support', true)
            .order('escalated_at', { ascending: false });

        // Filter by status
        if (status !== 'all') {
            query = query.eq('human_support_status', status);
        }

        const { data, error } = await query.limit(100);

        if (error) {
            console.error('Error fetching escalated conversations:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        // Format conversations with last message preview and chatbot name
        const conversations = (data || []).map(conv => {
            const messages = conv.messages || [];
            const lastUserMessage = [...messages]
                .reverse()
                .find(m => m.sender === 'user');

            return {
                id: conv.id,
                chatbot_id: conv.chatbot_id,
                chatbot_name: (conv.chatbots as any)?.name || 'Unknown',
                visitor_id: conv.visitor_id,
                started_at: conv.started_at,
                status: conv.human_support_status,
                escalated_at: conv.escalated_at,
                escalation_reason: conv.escalation_reason,
                page_url: conv.page_url,
                message_count: messages.length,
                last_message: lastUserMessage?.content?.substring(0, 100) || '',
                has_unread: conv.human_support_status === 'pending'
            };
        });

        return NextResponse.json({ success: true, conversations });
    } catch (err) {
        console.error('Error in human-support conversations:', err);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
