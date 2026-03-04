import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const embedCode = searchParams.get('embed_code');

    if (!embedCode) {
        return NextResponse.json({ error: 'Missing embed_code' }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from('chatbots')
            .select(`
                id, name, primary_color, welcome_message,
                widget_position, widget_size, button_shape,
                widget_width, widget_height, font_family,
                header_style, bubble_style, secondary_color,
                theme, show_avatar, header_subtitle
            `)
            .eq('embed_code', embedCode)
            .single();

        if (error || !data) {
            return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
        }

        return cors(NextResponse.json(data));
    } catch (err) {
        console.error('Config fetch error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

function cors(res: NextResponse) {
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res;
}

export async function OPTIONS() {
    return cors(new NextResponse(null));
}
