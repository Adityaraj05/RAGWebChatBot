import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { encrypt } from '@/lib/crypto';
import { getCurrentUserId } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        // Get current user
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await req.json();

        const { data, error } = await supabaseAdmin
            .from('chatbots')
            .insert({
                name: body.name,
                plan: body.plan,
                embed_code: body.embed_code,
                llm_provider: body.llm_provider,
                api_key: encrypt(body.api_key),
                model_name: body.model_name,
                system_prompt: body.system_prompt,
                primary_color: body.primary_color,
                welcome_message: body.welcome_message,
                user_id: userId, // Link to current user
                // Widget Customization
                widget_position: body.widget_position || 'bottom-right',
                widget_size: body.widget_size || 'medium',
                button_shape: body.button_shape || 'circle',
                widget_width: body.widget_width || 380,
                widget_height: body.widget_height || 520,
                font_family: body.font_family || 'Inter',
                header_style: body.header_style || 'solid',
                bubble_style: body.bubble_style || 'modern',
                secondary_color: body.secondary_color || '#8B5CF6',
                theme: body.theme || 'dark',
                show_avatar: body.show_avatar !== undefined ? body.show_avatar : true,
                header_subtitle: body.header_subtitle || 'Powered by AI',
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, chatbot: data });
    } catch (err) {
        console.error('Server error:', err);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

