import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function OPTIONS() {
    return new NextResponse(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}

function cors(res: NextResponse) {
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return res;
}

// GET - Widget polls for new messages (including human agent responses)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const conversationId = searchParams.get('conversationId');
        const lastMessageId = searchParams.get('lastMessageId');

        if (!conversationId) {
            return cors(NextResponse.json(
                { success: false, error: 'conversationId is required' },
                { status: 400 }
            ));
        }

        // Fetch new messages since lastMessageId
        let query = supabaseAdmin
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        // If lastMessageId provided, only get newer messages
        if (lastMessageId) {
            // Get the timestamp of the last message
            const { data: lastMsg } = await supabaseAdmin
                .from('messages')
                .select('created_at')
                .eq('id', lastMessageId)
                .single();

            if (lastMsg) {
                query = query.gt('created_at', lastMsg.created_at);
            }
        }

        const { data: messages, error } = await query;

        if (error) {
            console.error('Error polling messages:', error);
            return cors(NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            ));
        }

        // Also check if conversation is still requiring human support
        const { data: conversation } = await supabaseAdmin
            .from('conversations')
            .select('requires_human_support, human_support_status')
            .eq('id', conversationId)
            .single();

        return cors(NextResponse.json({
            success: true,
            messages: messages || [],
            isEscalated: conversation?.requires_human_support || false,
            supportStatus: conversation?.human_support_status || 'none'
        }));
    } catch (err) {
        console.error('Error in widget poll:', err);
        return cors(NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        ));
    }
}
