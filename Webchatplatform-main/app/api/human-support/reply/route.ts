import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST - Human agent sends a reply to a conversation
export async function POST(req: NextRequest) {
    try {
        const { conversationId, content, agentName } = await req.json();

        if (!conversationId || !content) {
            return NextResponse.json(
                { success: false, error: 'conversationId and content are required' },
                { status: 400 }
            );
        }

        // Insert the human agent's message
        const { data: message, error: messageError } = await supabaseAdmin
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender: 'bot', // Still 'bot' for widget display compatibility
                sender_type: 'human_agent',
                content: content,
                agent_name: agentName || 'Support Agent'
            })
            .select()
            .single();

        if (messageError) {
            console.error('Error inserting human reply:', messageError);
            return NextResponse.json(
                { success: false, error: messageError.message },
                { status: 500 }
            );
        }

        // Update conversation status to in_progress
        const { error: convError } = await supabaseAdmin
            .from('conversations')
            .update({ human_support_status: 'in_progress' })
            .eq('id', conversationId);

        if (convError) {
            console.error('Error updating conversation status:', convError);
            // Non-fatal, message was still sent
        }

        return NextResponse.json({ success: true, message });
    } catch (err) {
        console.error('Error in human-support reply:', err);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PATCH - Update conversation status (e.g., mark as resolved)
export async function PATCH(req: NextRequest) {
    try {
        const { conversationId, status } = await req.json();

        if (!conversationId || !status) {
            return NextResponse.json(
                { success: false, error: 'conversationId and status are required' },
                { status: 400 }
            );
        }

        const validStatuses = ['pending', 'in_progress', 'resolved'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { success: false, error: 'Invalid status' },
                { status: 400 }
            );
        }

        const { error } = await supabaseAdmin
            .from('conversations')
            .update({ human_support_status: status })
            .eq('id', conversationId);

        if (error) {
            console.error('Error updating conversation:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Error in human-support patch:', err);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
