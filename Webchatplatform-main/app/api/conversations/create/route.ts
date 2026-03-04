import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function OPTIONS() {
    return new NextResponse(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}

function cors(res: NextResponse) {
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return res;
}


export async function POST(req: NextRequest) {
    try {
        const { chatbotId, visitorId } = await req.json();

        const { data, error } = await supabaseAdmin
            .from('conversations')
            .insert({
                chatbot_id: chatbotId,
                visitor_id: visitorId,
            })
            .select()
            .single();

        if (error) {
            console.error('Create conversation error:', error);
            return cors(NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            ));
        }

        return cors(NextResponse.json({ success: true, conversation: data }));
    } catch (err) {
        console.error('Server error:', err);
        return cors(NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        ));
    }
}
