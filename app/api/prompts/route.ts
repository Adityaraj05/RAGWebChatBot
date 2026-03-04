import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Fetch all prompts
export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('prompts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching prompts:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ prompts: data || [] });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
    }
}

// POST - Create new prompt
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, description, category, content, is_ai_generated } = body;

        if (!title || !content) {
            return NextResponse.json(
                { error: 'Title and content are required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('prompts')
            .insert({
                title,
                description: description || '',
                category: category || 'Custom',
                content,
                is_ai_generated: is_ai_generated || false
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating prompt:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ prompt: data }, { status: 201 });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 });
    }
}

// DELETE - Remove prompt
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Prompt ID is required' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('prompts')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting prompt:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 });
    }
}
