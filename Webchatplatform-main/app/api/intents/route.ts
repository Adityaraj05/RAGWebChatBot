import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { decrypt } from '@/lib/crypto';
import {
    detectIntentsFromContent,
    storeIntents,
    getIntentsForChatbot,
    clearIntentsForChatbot,
    getIntentAnalytics,
    syncMessagesWithIntents,
    StoredIntent
} from '@/lib/intent-detector';

/**
 * GET /api/intents - Get intents for a chatbot
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const chatbotId = searchParams.get('chatbotId');
        const analytics = searchParams.get('analytics') === 'true';

        if (!chatbotId) {
            return NextResponse.json(
                { error: 'chatbotId is required' },
                { status: 400 }
            );
        }

        if (analytics) {
            const analyticsData = await getIntentAnalytics(chatbotId);
            return NextResponse.json({
                success: true,
                ...analyticsData
            });
        }

        const intents = await getIntentsForChatbot(chatbotId);
        return NextResponse.json({
            success: true,
            intents
        });

    } catch (error: any) {
        console.error('Error fetching intents:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch intents' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/intents - Detect intents from content
 * Uses chatbot's configured API key and LLM provider
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { chatbotId, content, regenerate } = body;

        if (!chatbotId) {
            return NextResponse.json(
                { error: 'chatbotId is required' },
                { status: 400 }
            );
        }

        // Fetch chatbot to get API key and provider
        const { data: chatbot, error: chatbotError } = await supabaseAdmin
            .from('chatbots')
            .select('api_key, llm_provider, model_name')
            .eq('id', chatbotId)
            .single();

        if (chatbotError || !chatbot) {
            return NextResponse.json(
                { error: 'Chatbot not found' },
                { status: 404 }
            );
        }

        if (!chatbot.api_key) {
            return NextResponse.json(
                { error: 'No API key configured for this chatbot' },
                { status: 400 }
            );
        }

        // Decrypt the API key
        let apiKey: string;
        try {
            apiKey = decrypt(chatbot.api_key);
        } catch (decryptError: any) {
            console.error('Intent API: decrypt failed', decryptError);
            return NextResponse.json(
                { error: 'Failed to read chatbot API key. Please re-save the chatbot API key in settings.' },
                { status: 400 }
            );
        }

        const provider = chatbot.llm_provider || 'openai';
        const model = chatbot.model_name || 'gpt-4o-mini';

        // Check if intents already exist
        const existingIntents = await getIntentsForChatbot(chatbotId);
        if (existingIntents.length > 0 && !regenerate) {
            return NextResponse.json({
                success: true,
                intents: existingIntents,
                message: 'Intents already detected. Set regenerate=true to re-detect.'
            });
        }

        // Get content to analyze
        let contentToAnalyze = content;

        if (!contentToAnalyze) {
            // Fetch content from document chunks
            const { data: chunks } = await supabaseAdmin
                .from('document_chunks')
                .select('content')
                .eq('chatbot_id', chatbotId)
                .limit(50);

            if (chunks && chunks.length > 0) {
                contentToAnalyze = chunks.map(c => c.content).join('\n\n');
            }
        }

        if (!contentToAnalyze || contentToAnalyze.length < 100) {
            return NextResponse.json(
                { error: 'Not enough content to detect intents. Please upload documents or index a website first.' },
                { status: 400 }
            );
        }

        // Clear existing intents if regenerating
        if (regenerate && existingIntents.length > 0) {
            await clearIntentsForChatbot(chatbotId);
        }

        // Detect intents using chatbot's configured provider
        const detectedIntents = await detectIntentsFromContent(contentToAnalyze, apiKey, provider, model);

        if (detectedIntents.length === 0) {
            return NextResponse.json(
                { error: 'Could not detect any intents from the content' },
                { status: 400 }
            );
        }

        // Store intents
        const storedIntents = await storeIntents(chatbotId, detectedIntents);

        // If regenerating, sync all existing messages with the new intents
        if (regenerate) {
            try {
                console.log(`[Intent Sync] Starting sync for chatbot ${chatbotId}...`);
                const syncResult = await syncMessagesWithIntents(chatbotId);
                console.log(`[Intent Sync] Completed: ${syncResult.classified}/${syncResult.totalMessages} messages classified, ${syncResult.errors} errors`);
                
                return NextResponse.json({
                    success: true,
                    intents: storedIntents,
                    message: `Detected ${storedIntents.length} intents and synced ${syncResult.classified} messages`,
                    syncResult
                });
            } catch (syncError: any) {
                console.error('[Intent Sync] Error syncing messages:', syncError);
                // Don't fail the request if sync fails, but log it
                return NextResponse.json({
                    success: true,
                    intents: storedIntents,
                    message: `Detected ${storedIntents.length} intents (sync failed: ${syncError.message})`,
                    warning: 'Intent detection succeeded but message sync failed. You may need to sync manually.'
                });
            }
        }

        return NextResponse.json({
            success: true,
            intents: storedIntents,
            message: `Detected ${storedIntents.length} intents`
        });

    } catch (error: any) {
        console.error('Error detecting intents:', error);

        const message = error?.message || error?.error?.message || 'Failed to detect intents';
        const status = error?.status === 401 ? 401 : 500;

        if (status === 401) {
            return NextResponse.json(
                { error: 'Invalid API key. Please check your chatbot API key in the chatbot settings.' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/intents - Remove intents for a chatbot
 */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const chatbotId = searchParams.get('chatbotId');

        if (!chatbotId) {
            return NextResponse.json(
                { error: 'chatbotId is required' },
                { status: 400 }
            );
        }

        await clearIntentsForChatbot(chatbotId);

        return NextResponse.json({
            success: true,
            message: 'Intents cleared'
        });

    } catch (error: any) {
        console.error('Error deleting intents:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete intents' },
            { status: 500 }
        );
    }
}
