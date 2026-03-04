import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function OPTIONS() {
    return cors(new NextResponse(null));
}

function cors(res: NextResponse) {
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            chatbotId,
            conversationId,
            visitorId,
            eventType,
            pageUrl,
            pageTitle,
            metadata
        } = body;

        if (!chatbotId || !eventType) {
            return cors(NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            ));
        }

        // Insert event
        const { error } = await supabaseAdmin
            .from('widget_events')
            .insert({
                chatbot_id: chatbotId,
                conversation_id: conversationId || null,
                visitor_id: visitorId,
                event_type: eventType,
                page_url: pageUrl,
                page_title: pageTitle,
                metadata: metadata || {}
            });

        if (error) {
            console.error('Analytics event error:', error);
            // Don't fail the request, just log
        }

        // Update conversation status if widget closed
        if (eventType === 'widget_closed' && conversationId) {
            await supabaseAdmin
                .from('conversations')
                .update({
                    status: 'closed',
                    ended_at: new Date().toISOString()
                })
                .eq('id', conversationId);
        }

        return cors(NextResponse.json({ success: true }));
    } catch (err) {
        console.error('Analytics API error:', err);
        return cors(NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        ));
    }
}
