import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { callLLM } from '@/lib/llm';
import { decrypt } from '@/lib/crypto';
import { getIntentsForChatbot, classifyMessageIntent } from '@/lib/intent-detector';

export async function OPTIONS() {
    return new NextResponse(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

function cors(res: NextResponse) {
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res;
}

// Check if message matches any escalation rules using AI
async function checkEscalationRules(
    message: string,
    rules: Array<{ name: string; description: string; brief_response?: string }>,
    apiKey: string,
    provider: string,
    model: string
): Promise<{ matched: boolean; rule?: { name: string; description: string; brief_response?: string } }> {
    if (!rules || rules.length === 0) {
        return { matched: false };
    }

    const ruleDescriptions = rules.map((r, i) => `${i + 1}. "${r.name}": ${r.description}`).join('\n');

    const classificationPrompt = `You are a message classifier. Analyze if the user's message relates to any of these topics that require human assistance:

${ruleDescriptions}

User message: "${message}"

If the message relates to ANY of the topics above, respond with ONLY the rule number (e.g., "1" or "2").
If the message does NOT relate to any topic, respond with "none".
Do not explain, just respond with the number or "none".`;

    try {
        const response = await callLLM(
            provider,
            apiKey,
            model,
            [{ role: 'user', content: classificationPrompt }],
            ''
        );

        const result = response?.trim().toLowerCase();
        console.log(`[Escalation] AI classification result: "${result}" for message: "${message.substring(0, 50)}..."`);

        if (result === 'none' || !result) {
            return { matched: false };
        }

        // Try to parse the rule number
        const ruleIndex = parseInt(result) - 1;
        if (!isNaN(ruleIndex) && ruleIndex >= 0 && ruleIndex < rules.length) {
            return { matched: true, rule: rules[ruleIndex] };
        }

        return { matched: false };
    } catch (error) {
        console.error('[Escalation] AI classification error:', error);
        return { matched: false };
    }
}

// Keywords that clearly indicate the user is asking about knowledge-base content (blog, news, etc.) — always allow through.
const KNOWLEDGE_BASE_CONTENT_KEYWORDS = [
    'blog', 'posted', 'post ', 'posts', 'article', 'articles', 'news', 'webinar', 'webinars',
    'faq', 'faqs', 'guide', 'guidelines', 'whitepaper', 'ebook', 'content package'
];

// Guardrail: block only clearly off-topic questions (e.g. math, trivia). Allow company/knowledge-base questions.
async function isWithinKnowledgeScope(
    message: string,
    systemPromptSummary: string,
    apiKey: string,
    provider: string,
    model: string
): Promise<boolean> {
    const lower = message.toLowerCase().trim();
    const hasContentKeyword = KNOWLEDGE_BASE_CONTENT_KEYWORDS.some(kw => lower.includes(kw));
    if (hasContentKeyword) {
        return true; // clearly asking about blog/news/content — skip scope LLM, let RAG answer
    }

    const context = (systemPromptSummary || 'This chatbot answers questions about the company, its team, services, history, and offerings.').slice(0, 500);
    const scopePrompt = `You are a scope checker. This chatbot is for a company and has a knowledge base that can include: company info, about us, services, team, history, blog posts, news, articles, webinars, FAQs, guides, brand guidelines, and other uploaded documents.

Reply NO only if the user's question is clearly OFF-TOPIC, for example:
- General math or calculations (e.g. "what is 8 + 8", "solve 2x=4")
- General trivia, weather, sports, or world news unrelated to the company
- Questions clearly about another company or unrelated subject
- Jokes, coding help, or random chitchat with no link to the company

Reply YES if the question could be answered from the company's knowledge base, including:
- Company, team, when formed, services, products, marketing, co-op, MDF
- The company's blog, blog posts, news, articles (e.g. "blog posted on [date]", "what blogs have they posted", "tell me about their news")
- Webinars, content packages, FAQs, brand guidelines, or any uploaded documents
- Anything that might be on the company's website or in its docs

Even if the wording is informal or unclear, reply YES when the question could be about the company or its content. When in doubt, reply YES.

Company context:
${context}

User message: "${message}"

Is this question OFF-TOPIC (reply NO) or could it be about the company / its content / knowledge base (reply YES)? Reply with exactly YES or NO.`;

    try {
        const response = await callLLM(
            provider,
            apiKey,
            model,
            [{ role: 'user', content: scopePrompt }],
            ''
        );
        const answer = response?.trim().toUpperCase() || '';
        const inScope = answer.startsWith('YES');
        if (!inScope) {
            console.log(`[Guardrail] Out of scope: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}" → blocked (scope check: ${answer})`);
        }
        return inScope;
    } catch (error) {
        console.error('[Guardrail] Scope check error:', error);
        return true; // allow through on error so we don't block valid questions
    }
}

const OUT_OF_SCOPE_MESSAGE = `I can only help with questions about our company, our services, blog, news, webinars, and other content in our knowledge base. For general questions (like math or other topics), please try a general assistant or search the web.

Is there anything about us or our content I can help you with?`;

export async function POST(req: NextRequest) {
    try {
        const { conversationId, message, embedCode } = await req.json();

        // Get chatbot config
        const { data: chatbot, error: chatbotError } = await supabase
            .from('chatbots')
            .select('*')
            .eq('embed_code', embedCode)
            .single();

        if (chatbotError || !chatbot) {
            return cors(NextResponse.json(
                { success: false, error: 'Chatbot not found' },
                { status: 404 }
            ));
        }

        const decryptedApiKey = decrypt(chatbot.api_key);

        // Get message history
        const { data: messages } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at')
            .limit(20);

        // Classify user message intent (async, non-blocking)
        let detectedIntentId: string | null = null;
        try {
            const intents = await getIntentsForChatbot(chatbot.id);
            if (intents.length > 0) {
                detectedIntentId = await classifyMessageIntent(
                    message,
                    intents,
                    decryptedApiKey,
                    chatbot.llm_provider,
                    chatbot.model_name
                );
            }
        } catch (_intentError) {
            // intent classification is analytics-only; skip silently
        }

        // Save user message with intent
        await supabaseAdmin.from('messages').insert({
            conversation_id: conversationId,
            sender: 'user',
            sender_type: 'user',
            content: message,
            detected_intent_id: detectedIntentId
        });

        // Update conversation message count
        await supabaseAdmin
            .from('conversations')
            .update({ total_messages: (messages?.length || 0) + 1 })
            .eq('id', conversationId);

        // Check escalation rules using AI
        const escalationRules = chatbot.escalation_rules || [];
        let isEscalated = false;
        let botResponse: string = '';

        if (escalationRules.length > 0) {
            const escalationCheck = await checkEscalationRules(
                message,
                escalationRules,
                decryptedApiKey,
                chatbot.llm_provider,
                chatbot.model_name
            );

            if (escalationCheck.matched && escalationCheck.rule) {
                console.log(`[Escalation] Message matched rule: "${escalationCheck.rule.name}"`);
                isEscalated = true;

                // Generate brief response
                const briefResponse = escalationCheck.rule.brief_response ||
                    `I understand you have a question about ${escalationCheck.rule.name.toLowerCase().replace(/_/g, ' ')}.`;

                botResponse = `${briefResponse}
                \n\nI'm not able to answer that accurately right now. I'm forwarding this to a human agent who can help. Please wait, someone will respond shortly.`;

                // Update conversation for human support
                await supabaseAdmin
                    .from('conversations')
                    .update({
                        requires_human_support: true,
                        human_support_status: 'pending',
                        escalated_at: new Date().toISOString(),
                        escalation_reason: `Matched rule: ${escalationCheck.rule.name}`
                    })
                    .eq('id', conversationId);
            }
        }

        // If not escalated, check scope guardrail then generate normal response
        if (!isEscalated) {
            const scopeSummary = (chatbot.system_prompt || '').slice(0, 500);
            const withinScope = await isWithinKnowledgeScope(
                message,
                scopeSummary,
                decryptedApiKey,
                chatbot.llm_provider,
                chatbot.model_name
            );

            if (!withinScope) {
                botResponse = OUT_OF_SCOPE_MESSAGE;
            } else {
            // Format for LLM
            const formattedMessages = (messages || []).map((m) => ({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.content
            }));
            formattedMessages.push({ role: 'user', content: message });

            // RAG: Get relevant context from knowledge base
            let ragContext = '';
            try {
                const { searchSimilarChunks } = await import('@/lib/document-processor');
                const relevantChunks = await searchSimilarChunks(
                    chatbot.id,
                    message,
                    5,
                    decryptedApiKey,
                    chatbot.llm_provider
                );

                if (relevantChunks.length > 0) {
                    ragContext = '\n\n### Relevant Knowledge Base Context:\n' +
                        relevantChunks.map((chunk, i) => {
                            if (chunk.page_url && chunk.page_title) {
                                return `[${i + 1}] From page "${chunk.page_title}" (${chunk.page_url}):\n${chunk.content}`;
                            }
                            return `[${i + 1}] ${chunk.content}`;
                        }).join('\n\n');
                    const sources = relevantChunks.map(c => c.page_title || 'Untitled').filter(Boolean);
                    const sourcesList = sources.length ? sources.join(', ') : relevantChunks.map((_, i) => `Chunk ${i + 1}`).join(', ');
                    console.log(`[Response source] Semantic relation: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}" → RAG (${relevantChunks.length} chunks) + main LLM. Sources: ${sourcesList || 'knowledge base'}`);
                } else {
                    console.log(`[Response source] Semantic relation: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}" → no RAG context; response from system prompt + main LLM only`);
                }
            } catch (ragError) {
                console.log('[Response source] Semantic relation: RAG skipped (error). Response from system prompt + main LLM only.', ragError);
            }

            // Augment system prompt with RAG context and guidelines
            const commonGuidelines = `
                **Response Guidelines:**
                - If a user asks about the signup process, booking an appointment, or related topics, ALWAYS provide this link in your response: https://rivetmro.com/book-appointment/
                - At the end of your response, suggest 1-2 relevant follow-up questions that the user might want to ask next. Format them as a list.
                - If the user responds with "yes", "sure", "tell me more", or similar affirmatives, answer the follow-up questions you previously suggested.
                - Keep responses VERY short and concise. Aim for a maximum of 3-5 short bullet points or 1-2 brief paragraphs.
                - Avoid exhaustive lists. If there are many items, group them or mention only the most relevant ones.
                - Avoid fluff or unnecessary transitional phrases. Get straight to the answer.
                - Avoid markdown headings (e.g., #, ##, ###) - use bold text (**) for emphasis.
                - If a topic requires depth, provide a 1-2 sentence overview first, then offer to elaborate if needed.`;

            const augmentedSystemPrompt = ragContext
                ? `${chatbot.system_prompt}\n\n
               Use the following knowledge base context to answer questions when relevant. When referencing information from specific pages, you can mention the page name to help users navigate.
               ${commonGuidelines}
               ${ragContext}`
                : `${chatbot.system_prompt}\n\n${commonGuidelines}`;

            // Call LLM
            try {
                botResponse = await callLLM(
                    chatbot.llm_provider,
                    decryptedApiKey,
                    chatbot.model_name,
                    formattedMessages,
                    augmentedSystemPrompt
                );
            } catch (llmError) {
                console.error('LLM Error:', llmError);
                botResponse = "I'm sorry, I encountered an error processing your request. Please try again.";
            }
            }
        }

        // Save bot response
        const { data: botMessage } = await supabaseAdmin
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender: 'bot',
                sender_type: 'bot',
                content: botResponse
            })
            .select()
            .single();

        return cors(NextResponse.json({
            success: true,
            message: botMessage,
            isEscalated
        }));
    } catch (err) {
        console.error('Chat API Error:', err);
        return cors(NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        ));
    }
}

