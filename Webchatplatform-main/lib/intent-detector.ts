import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase';

export interface DetectedIntent {
    name: string;
    description: string;
    keywords: string[];
}

export interface StoredIntent extends DetectedIntent {
    id: string;
    chatbot_id: string;
    color: string;
    is_active: boolean;
    message_count: number;
}

// System prompt for intent detection
const INTENT_DETECTION_PROMPT = `You are an expert at analyzing content and identifying user intents.

Given the following content from a website or document, identify 5-10 distinct user intents that visitors might have.

For each intent, provide:
- name: A short, clear name (e.g., "Loan Inquiry", "Account Balance", "Product Pricing")
- description: What the user is trying to accomplish (1-2 sentences)
- keywords: 3-5 trigger words or phrases that indicate this intent

IMPORTANT:
- Focus on actionable intents (questions users would ask)
- Be specific to the content provided
- Avoid generic intents like "General Question"

Return ONLY a valid JSON array, no other text.

Example format:
[
  {
    "name": "Loan Inquiry",
    "description": "User wants information about loan options, eligibility, or application process",
    "keywords": ["loan", "borrow", "interest rate", "EMI", "eligibility"]
  }
]

Content to analyze:
`;

// System prompt for intent classification
const INTENT_CLASSIFICATION_PROMPT = `You are a precise intent classifier. Given a user message and a list of possible intents, determine which intent best matches the message.

Rules:
- Return ONLY the exact intent name that best matches
- If no intent matches well, return "other"
- Do not explain, just return the intent name

Available intents:
`;

/**
 * Detect intents from content using the chatbot's configured LLM
 */
export async function detectIntentsFromContent(
    content: string,
    apiKey: string,
    provider: string = 'openai',
    model: string = 'gpt-4o-mini',
    maxIntents: number = 10
): Promise<DetectedIntent[]> {
    const { callLLM } = await import('@/lib/llm');

    // Sample content if too long (take beginning, middle, end)
    const maxContentLength = 8000;
    let sampledContent = content;

    if (content.length > maxContentLength) {
        const chunkSize = Math.floor(maxContentLength / 3);
        const beginning = content.slice(0, chunkSize);
        const middle = content.slice(
            Math.floor(content.length / 2) - chunkSize / 2,
            Math.floor(content.length / 2) + chunkSize / 2
        );
        const end = content.slice(-chunkSize);
        sampledContent = `${beginning}\n\n[...]\n\n${middle}\n\n[...]\n\n${end}`;
    }

    const responseText = await callLLM(
        provider,
        apiKey,
        model,
        [{ role: 'user', content: INTENT_DETECTION_PROMPT + sampledContent }],
        ''
    );

    try {
        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = responseText || '[]';
        const jsonMatch = responseText?.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }

        const intents = JSON.parse(jsonStr) as DetectedIntent[];
        return intents.slice(0, maxIntents);
    } catch (error) {
        console.error('Failed to parse intents:', error, responseText);
        return [];
    }
}

/**
 * Classify a user message against known intents
 * Uses the same LLM provider as the chatbot
 */
export async function classifyMessageIntent(
    message: string,
    intents: StoredIntent[],
    apiKey: string,
    provider: string = 'openai',
    model: string = 'gpt-4o-mini'
): Promise<string | null> {
    if (intents.length === 0) return null;

    const { callLLM } = await import('@/lib/llm');

    const intentList = intents
        .map(i => `- ${i.name}: ${i.description}`)
        .join('\n');

    const systemPrompt = INTENT_CLASSIFICATION_PROMPT + intentList;
    const userMessage = `Classify this message: "${message}"`;

    const response = await callLLM(
        provider,
        apiKey,
        model,
        [{ role: 'user', content: userMessage }],
        systemPrompt
    );

    const intentName = response?.trim() || 'other';

    // Find matching intent (case-insensitive, also try partial match)
    let matchedIntent = intents.find(
        i => i.name.toLowerCase() === intentName.toLowerCase()
    );

    // If no exact match, try to find a partial match
    if (!matchedIntent && intentName !== 'other') {
        matchedIntent = intents.find(
            i => i.name.toLowerCase().includes(intentName.toLowerCase()) ||
                intentName.toLowerCase().includes(i.name.toLowerCase())
        );
    }

    const semanticRelation = matchedIntent
        ? `"${message.substring(0, 50)}${message.length > 50 ? '...' : ''}" → ${matchedIntent.name} (id: ${matchedIntent.id})`
        : `"${message.substring(0, 50)}${message.length > 50 ? '...' : ''}" → none`;
    console.log(`[Intent Classifier] Semantic relation: ${semanticRelation}`);

    return matchedIntent?.id || null;
}

/**
 * Store detected intents in database
 */
export async function storeIntents(
    chatbotId: string,
    intents: DetectedIntent[]
): Promise<StoredIntent[]> {
    // Generate colors for intents
    const colors = [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
        '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];

    const records = intents.map((intent, index) => ({
        chatbot_id: chatbotId,
        name: intent.name,
        description: intent.description || '',
        keywords: Array.isArray(intent.keywords) ? intent.keywords : [],
        color: colors[index % colors.length],
        is_active: true
    }));

    const { data, error } = await supabaseAdmin
        .from('chatbot_intents')
        .insert(records)
        .select();

    if (error) {
        console.error('Failed to store intents:', error);
        throw error;
    }

    return data as StoredIntent[];
}

/**
 * Get intents for a chatbot
 */
export async function getIntentsForChatbot(chatbotId: string): Promise<StoredIntent[]> {
    const { data, error } = await supabaseAdmin
        .from('chatbot_intents')
        .select('*')
        .eq('chatbot_id', chatbotId)
        .eq('is_active', true)
        .order('message_count', { ascending: false });

    if (error) {
        console.error('Failed to fetch intents:', error);
        return [];
    }

    return data as StoredIntent[];
}

/**
 * Delete all intents for a chatbot (for re-detection)
 */
export async function clearIntentsForChatbot(chatbotId: string): Promise<void> {
    // First, get all intent IDs for this chatbot
    const { data: intents, error: fetchError } = await supabaseAdmin
        .from('chatbot_intents')
        .select('id')
        .eq('chatbot_id', chatbotId);

    if (fetchError) {
        console.error('Failed to fetch intents for clearing:', fetchError);
        throw fetchError;
    }

    if (intents && intents.length > 0) {
        const intentIds = intents.map(i => i.id);

        // Set detected_intent_id to NULL in messages that reference these intents
        // This prevents foreign key constraint violations
        const { error: updateError } = await supabaseAdmin
            .from('messages')
            .update({ detected_intent_id: null })
            .in('detected_intent_id', intentIds);

        if (updateError) {
            console.error('Failed to clear intent references in messages:', updateError);
            throw updateError;
        }
    }

    // Now safe to delete the intents
    const { error } = await supabaseAdmin
        .from('chatbot_intents')
        .delete()
        .eq('chatbot_id', chatbotId);

    if (error) {
        console.error('Failed to clear intents:', error);
        throw error;
    }
}

/**
 * Get intent analytics for a chatbot from entire chat history (all conversations).
 * Counts are computed from messages table, not from stored message_count on intents.
 */
export async function getIntentAnalytics(chatbotId: string): Promise<{
    intents: Array<{ name: string; count: number; color: string; percentage: number }>;
    totalClassified: number;
}> {
    const intents = await getIntentsForChatbot(chatbotId);
    if (intents.length === 0) {
        return { intents: [], totalClassified: 0 };
    }

    // Get all conversations for this chatbot (entire history)
    const { data: conversations, error: convError } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .eq('chatbot_id', chatbotId);

    if (convError || !conversations || conversations.length === 0) {
        return {
            intents: intents.map(i => ({
                name: i.name,
                count: 0,
                color: i.color,
                percentage: 0
            })),
            totalClassified: 0
        };
    }

    const conversationIds = conversations.map(c => c.id);

    // Get all user messages across all conversations (entire history)
    const { data: messages, error: messagesError } = await supabaseAdmin
        .from('messages')
        .select('detected_intent_id')
        .in('conversation_id', conversationIds)
        .eq('sender', 'user');

    if (messagesError) {
        console.error('Failed to fetch messages for intent analytics:', messagesError);
        return {
            intents: intents.map(i => ({
                name: i.name,
                count: i.message_count || 0,
                color: i.color,
                percentage: 0
            })),
            totalClassified: intents.reduce((sum, i) => sum + (i.message_count || 0), 0)
        };
    }

    // Count messages per intent from entire history (in JS; no GROUP BY in client)
    const countByIntentId: Record<string, number> = {};
    for (const intent of intents) {
        countByIntentId[intent.id] = 0;
    }
    let totalClassified = 0;
    for (const msg of messages || []) {
        const intentId = msg.detected_intent_id;
        if (intentId && countByIntentId[intentId] !== undefined) {
            countByIntentId[intentId]++;
            totalClassified++;
        }
    }

    return {
        intents: intents.map(i => {
            const count = countByIntentId[i.id] ?? 0;
            return {
                name: i.name,
                count,
                color: i.color,
                percentage: totalClassified > 0 ? Math.round((count / totalClassified) * 100) : 0
            };
        }),
        totalClassified
    };
}

/**
 * Sync all existing messages for a chatbot with the current intents
 * Re-classifies all user messages and updates their detected_intent_id
 */
export async function syncMessagesWithIntents(chatbotId: string): Promise<{
    totalMessages: number;
    classified: number;
    errors: number;
}> {
    // Get chatbot config
    const { data: chatbot, error: chatbotError } = await supabaseAdmin
        .from('chatbots')
        .select('api_key, llm_provider, model_name')
        .eq('id', chatbotId)
        .single();

    if (chatbotError || !chatbot || !chatbot.api_key) {
        throw new Error('Chatbot not found or no API key configured');
    }

    // Get current intents
    const intents = await getIntentsForChatbot(chatbotId);
    if (intents.length === 0) {
        return { totalMessages: 0, classified: 0, errors: 0 };
    }

    // Decrypt API key
    const { decrypt } = await import('@/lib/crypto');
    const apiKey = decrypt(chatbot.api_key);
    const provider = chatbot.llm_provider || 'openai';
    const model = chatbot.model_name || 'gpt-4o-mini';

    // Get all conversations for this chatbot
    const { data: conversations, error: convError } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .eq('chatbot_id', chatbotId);

    if (convError || !conversations || conversations.length === 0) {
        return { totalMessages: 0, classified: 0, errors: 0 };
    }

    const conversationIds = conversations.map(c => c.id);

    // Get all user messages for these conversations
    const { data: messages, error: messagesError } = await supabaseAdmin
        .from('messages')
        .select('id, content, detected_intent_id')
        .in('conversation_id', conversationIds)
        .eq('sender', 'user')
        .order('created_at', { ascending: true });

    if (messagesError || !messages || messages.length === 0) {
        return { totalMessages: 0, classified: 0, errors: 0 };
    }

    let classified = 0;
    let errors = 0;

    // Process messages in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        
        await Promise.all(
            batch.map(async (message) => {
                try {
                    // Classify the message
                    const detectedIntentId = await classifyMessageIntent(
                        message.content,
                        intents,
                        apiKey,
                        provider,
                        model
                    );

                    // Update the message if intent was detected
                    if (detectedIntentId) {
                        const { error: updateError } = await supabaseAdmin
                            .from('messages')
                            .update({ detected_intent_id: detectedIntentId })
                            .eq('id', message.id);

                        if (!updateError) {
                            classified++;
                        } else {
                            console.error(`Failed to update message ${message.id}:`, updateError);
                            errors++;
                        }
                    } else {
                        // Clear intent if no match found
                        if (message.detected_intent_id) {
                            const { error: updateError } = await supabaseAdmin
                                .from('messages')
                                .update({ detected_intent_id: null })
                                .eq('id', message.id);

                            if (updateError) {
                                errors++;
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error classifying message ${message.id}:`, error);
                    errors++;
                }
            })
        );

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < messages.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    // Refresh message counts in intents table
    // The trigger should handle this, but let's manually update to be sure
    for (const intent of intents) {
        const { count, error: countError } = await supabaseAdmin
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('detected_intent_id', intent.id);

        if (!countError) {
            await supabaseAdmin
                .from('chatbot_intents')
                .update({ message_count: count || 0 })
                .eq('id', intent.id);
        }
    }

    return {
        totalMessages: messages.length,
        classified,
        errors
    };
}

/**
 * Trigger automatic intent detection for a chatbot
 * Called after knowledge base upload/indexing completes
 */
export async function triggerIntentDetection(chatbotId: string): Promise<void> {
    // Fetch chatbot to get API key and provider
    const { data: chatbot, error: chatbotError } = await supabaseAdmin
        .from('chatbots')
        .select('api_key, llm_provider, model_name')
        .eq('id', chatbotId)
        .single();

    if (chatbotError || !chatbot || !chatbot.api_key) {
        console.log('[Intent] No API key configured, skipping auto-detection');
        return;
    }

    // Decrypt API key
    const { decrypt } = await import('@/lib/crypto');
    const apiKey = decrypt(chatbot.api_key);
    const provider = chatbot.llm_provider || 'openai';
    const model = chatbot.model_name || 'gpt-4o-mini';

    // Clear existing intents for fresh detection
    await clearIntentsForChatbot(chatbotId);

    // Fetch content from document chunks
    const { data: chunks } = await supabaseAdmin
        .from('document_chunks')
        .select('content')
        .eq('chatbot_id', chatbotId)
        .limit(50);

    if (!chunks || chunks.length === 0) {
        console.log('[Intent] No content available for intent detection');
        return;
    }

    const contentToAnalyze = chunks.map(c => c.content).join('\n\n');

    if (contentToAnalyze.length < 100) {
        console.log('[Intent] Content too short for intent detection');
        return;
    }

    // Detect intents
    const detectedIntents = await detectIntentsFromContent(contentToAnalyze, apiKey, provider, model);

    if (detectedIntents.length === 0) {
        console.log('[Intent] No intents detected from content');
        return;
    }

    // Store intents
    await storeIntents(chatbotId, detectedIntents);
    console.log(`[Intent] Auto-detected ${detectedIntents.length} intents for chatbot ${chatbotId}`);
}
