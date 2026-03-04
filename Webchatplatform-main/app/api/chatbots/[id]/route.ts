import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { encrypt, decrypt } from '@/lib/crypto';

// GET - Fetch single chatbot by ID
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { data: chatbot, error } = await supabase
            .from('chatbots')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !chatbot) {
            return NextResponse.json(
                { success: false, error: 'Chatbot not found' },
                { status: 404 }
            );
        }

        // Don't expose the encrypted API key
        const { api_key, ...safeChatbot } = chatbot;

        return NextResponse.json({ success: true, chatbot: safeChatbot });
    } catch (err) {
        console.error('Error fetching chatbot:', err);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT - Update chatbot
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Build update object - only include fields that are provided
        const updateData: Record<string, any> = {};

        // Basic fields
        if (body.name !== undefined) updateData.name = body.name;
        if (body.plan !== undefined) updateData.plan = body.plan;
        if (body.llm_provider !== undefined) updateData.llm_provider = body.llm_provider;
        if (body.model_name !== undefined) updateData.model_name = body.model_name;
        if (body.system_prompt !== undefined) updateData.system_prompt = body.system_prompt;
        if (body.primary_color !== undefined) updateData.primary_color = body.primary_color;
        if (body.welcome_message !== undefined) updateData.welcome_message = body.welcome_message;

        // If API key is provided and not empty, encrypt and update it
        if (body.api_key && body.api_key.trim()) {
            updateData.api_key = encrypt(body.api_key);
        }

        // Widget customization fields
        if (body.widget_position !== undefined) updateData.widget_position = body.widget_position;
        if (body.widget_size !== undefined) updateData.widget_size = body.widget_size;
        if (body.button_shape !== undefined) updateData.button_shape = body.button_shape;
        if (body.widget_width !== undefined) updateData.widget_width = body.widget_width;
        if (body.widget_height !== undefined) updateData.widget_height = body.widget_height;
        if (body.font_family !== undefined) updateData.font_family = body.font_family;
        if (body.header_style !== undefined) updateData.header_style = body.header_style;
        if (body.bubble_style !== undefined) updateData.bubble_style = body.bubble_style;
        if (body.secondary_color !== undefined) updateData.secondary_color = body.secondary_color;
        if (body.theme !== undefined) updateData.theme = body.theme;
        if (body.show_avatar !== undefined) updateData.show_avatar = body.show_avatar;
        if (body.header_subtitle !== undefined) updateData.header_subtitle = body.header_subtitle;

        // Human intervention escalation rules
        if (body.escalation_rules !== undefined) updateData.escalation_rules = body.escalation_rules;

        const { data, error } = await supabaseAdmin
            .from('chatbots')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Supabase update error:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        // Don't expose the encrypted API key
        const { api_key, ...safeChatbot } = data;

        return NextResponse.json({ success: true, chatbot: safeChatbot });
    } catch (err) {
        console.error('Error updating chatbot:', err);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE - Delete chatbot (cascades to conversations, messages, etc.)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Delete the chatbot - foreign key cascades will handle related data
        const { error } = await supabaseAdmin
            .from('chatbots')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Supabase delete error:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, message: 'Chatbot deleted successfully' });
    } catch (err) {
        console.error('Error deleting chatbot:', err);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
