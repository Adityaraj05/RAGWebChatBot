import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
        }

        // First, delete all messages associated with this conversation
        const { error: messagesError } = await supabaseAdmin
            .from('messages')
            .delete()
            .eq('conversation_id', id);

        if (messagesError) {
            console.error('Error deleting messages:', messagesError);
            return NextResponse.json({ error: `Failed to delete messages: ${messagesError.message}` }, { status: 500 });
        }

        // Also delete widget_events associated with this conversation
        const { error: eventsError } = await supabaseAdmin
            .from('widget_events')
            .delete()
            .eq('conversation_id', id);

        if (eventsError) {
            console.error('Error deleting widget events:', eventsError);
            // Don't fail the request if widget_events deletion fails, but log it
        }

        // Now delete the conversation itself
        const { error } = await supabaseAdmin
            .from('conversations')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting conversation:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Conversation deleted successfully' });
    } catch (error: any) {
        console.error('Delete conversation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
