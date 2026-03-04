import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/chatbot/[id]/analytics - Fetch analytics data server-side (bypasses RLS, live data)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: chatbotId } = await params;
        const { searchParams } = new URL(request.url);
        const dateRange = searchParams.get('dateRange') || '7d';

        if (!chatbotId) {
            return NextResponse.json({ error: 'Chatbot ID required' }, { status: 400 });
        }

        let dateFilter: string | null = null;
        if (dateRange === '7d') {
            dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        } else if (dateRange === '30d') {
            dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        // Fetch chatbot
        const { data: chatbot, error: chatbotError } = await supabaseAdmin
            .from('chatbots')
            .select('id, name')
            .eq('id', chatbotId)
            .single();

        if (chatbotError || !chatbot) {
            return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
        }

        // Conversations: use started_at (DB column)
        let convQuery = supabaseAdmin
            .from('conversations')
            .select('*, messages(*)')
            .eq('chatbot_id', chatbotId)
            .order('started_at', { ascending: false })
            .limit(100);

        if (dateFilter) {
            convQuery = convQuery.gte('started_at', dateFilter);
        }

        const { data: conversations, error: convError } = await convQuery;

        if (convError) {
            console.error('Analytics API: conversations error', convError);
            return NextResponse.json(
                { error: convError.message || 'Failed to fetch conversations' },
                { status: 500 }
            );
        }

        // Widget events
        let eventsQuery = supabaseAdmin
            .from('widget_events')
            .select('*')
            .eq('chatbot_id', chatbotId)
            .order('created_at', { ascending: false })
            .limit(500);

        if (dateFilter) {
            eventsQuery = eventsQuery.gte('created_at', dateFilter);
        }

        const { data: events, error: eventsError } = await eventsQuery;

        if (eventsError) {
            console.error('Analytics API: widget_events error', eventsError);
        }

        // Ensure started_at is set for frontend (DB uses started_at)
        const convsWithStartedAt = (conversations || []).map((c: Record<string, unknown>) => ({
            ...c,
            started_at: c.started_at ?? c.created_at,
        }));

        return NextResponse.json({
            chatbot,
            conversations: convsWithStartedAt,
            events: events || [],
        });
    } catch (err: unknown) {
        console.error('Analytics API error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
