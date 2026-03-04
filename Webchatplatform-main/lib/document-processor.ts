import { supabaseAdmin } from '@/lib/supabase';
import mammoth from 'mammoth';
import { decrypt } from './crypto';

// Import will be dynamically loaded to avoid issues with SSR
let pipeline: any = null;
let embeddingModel: any = null;

async function getEmbeddingPipeline() {
    if (!pipeline) {
        // Dynamic import to avoid SSR issues
        const { pipeline: transformersPipeline } = await import('@xenova/transformers');
        pipeline = transformersPipeline;
    }

    if (!embeddingModel) {
        // Use all-MiniLM-L6-v2 for embeddings (384 dimensions)
        embeddingModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }

    return embeddingModel;
}

// Generate embedding using OpenAI (1536 dimensions)
async function generateOpenAIEmbedding(text: string, apiKey: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'text-embedding-3-small', // 1536 dimensions
            input: text
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI embedding API error');
    }

    const data = await response.json();
    return data.data[0].embedding;
}

// Extract text from different file types
async function extractText(buffer: ArrayBuffer, mimeType: string): Promise<string> {
    const uint8Array = new Uint8Array(buffer);

    switch (mimeType) {
        case 'application/pdf': {
            // Use unpdf which is designed for serverless environments
            const { extractText: extractPdfText } = await import('unpdf');
            // unpdf expects Uint8Array directly
            const result = await extractPdfText(uint8Array);
            // unpdf returns an array of text per page, join them
            return Array.isArray(result.text) ? result.text.join('\n') : result.text;
        }

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
            // mammoth for DOCX
            const result = await mammoth.extractRawText({ buffer: Buffer.from(uint8Array) });
            return result.value;
        }

        case 'text/plain':
        case 'text/markdown': {
            // Plain text
            const decoder = new TextDecoder('utf-8');
            return decoder.decode(uint8Array);
        }

        default:
            throw new Error(`Unsupported file type: ${mimeType}`);
    }
}

// Split text into chunks with overlap
function chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
    const chunks: string[] = [];

    // Clean the text
    const cleanedText = text
        .replace(/\s+/g, ' ')
        .trim();

    if (cleanedText.length === 0) {
        return [];
    }

    if (cleanedText.length <= chunkSize) {
        return [cleanedText];
    }

    // Split into sentences first for better chunks
    const sentences = cleanedText.match(/[^.!?]+[.!?]+/g) || [cleanedText];

    let currentChunk = '';

    for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();

        if (currentChunk.length + trimmedSentence.length <= chunkSize) {
            currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
        } else {
            if (currentChunk) {
                chunks.push(currentChunk);
            }

            // If single sentence is too long, split by words
            if (trimmedSentence.length > chunkSize) {
                const words = trimmedSentence.split(' ');
                currentChunk = '';

                for (const word of words) {
                    if (currentChunk.length + word.length + 1 <= chunkSize) {
                        currentChunk += (currentChunk ? ' ' : '') + word;
                    } else {
                        if (currentChunk) {
                            chunks.push(currentChunk);
                        }
                        currentChunk = word;
                    }
                }
            } else {
                currentChunk = trimmedSentence;
            }
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}

// Generate embedding for a text chunk
// Uses OpenAI if apiKey and provider are provided (1536 dims), otherwise falls back to local model (384 dims)
async function generateEmbedding(text: string, apiKey?: string, provider?: string): Promise<number[]> {
    // Use OpenAI embeddings if API key and provider are available (matches database 1536 dimensions)
    if (apiKey && provider === 'openai') {
        try {
            return await generateOpenAIEmbedding(text, apiKey);
        } catch (error) {
            console.warn('OpenAI embedding failed, falling back to local model:', error);
            // Fall through to local model
        }
    }

    // Fallback to local model (384 dimensions - note: database must match!)
    const model = await getEmbeddingPipeline();
    const output = await model(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}

// Main document processing function
export async function processDocument(
    documentId: string,
    fileBuffer: ArrayBuffer,
    mimeType: string,
    chatbotId: string
): Promise<void> {
    try {
        console.log(`Processing document ${documentId}...`);

        // Get chatbot to retrieve API key and provider for embeddings
        const { data: chatbot, error: chatbotError } = await supabaseAdmin
            .from('chatbots')
            .select('api_key, llm_provider')
            .eq('id', chatbotId)
            .single();

        if (chatbotError || !chatbot) {
            throw new Error('Chatbot not found');
        }

        // Decrypt API key if available
        let decryptedApiKey: string | undefined;
        try {
            decryptedApiKey = decrypt(chatbot.api_key);
        } catch (e) {
            console.warn('Could not decrypt API key, will use local embeddings:', e);
        }

        // Update status to processing
        await supabaseAdmin
            .from('documents')
            .update({ status: 'processing' })
            .eq('id', documentId);

        // Extract text
        const text = await extractText(fileBuffer, mimeType);

        if (!text || text.trim().length === 0) {
            throw new Error('No text could be extracted from document');
        }

        console.log(`Extracted ${text.length} characters from document`);

        // Chunk the text
        const chunks = chunkText(text);

        if (chunks.length === 0) {
            throw new Error('No chunks could be created from document');
        }

        console.log(`Created ${chunks.length} chunks`);

        // Generate embeddings and store chunks
        const chunkRecords = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`Generating embedding for chunk ${i + 1}/${chunks.length}`);

            const embedding = await generateEmbedding(chunk, decryptedApiKey, chatbot.llm_provider);

            chunkRecords.push({
                document_id: documentId,
                chatbot_id: chatbotId,
                content: chunk,
                embedding: embedding,
                chunk_index: i,
                token_count: Math.ceil(chunk.length / 4) // Rough estimate
            });
        }

        // Insert all chunks
        const { error: insertError } = await supabaseAdmin
            .from('document_chunks')
            .insert(chunkRecords);

        if (insertError) {
            throw insertError;
        }

        // Update document status to ready
        await supabaseAdmin
            .from('documents')
            .update({
                status: 'ready',
                chunk_count: chunks.length
            })
            .eq('id', documentId);

        console.log(`Document ${documentId} processed successfully with ${chunks.length} chunks`);

        // Auto-detect intents after successful document processing
        try {
            const { triggerIntentDetection } = await import('@/lib/intent-detector');
            await triggerIntentDetection(chatbotId);
            console.log(`[Intent] Auto-detected intents after document upload for chatbot ${chatbotId}`);
        } catch (intentError) {
            console.log('[Intent] Auto-detection skipped:', intentError);
        }

    } catch (error: any) {
        console.error(`Error processing document ${documentId}:`, error);

        // Update status to error
        await supabaseAdmin
            .from('documents')
            .update({
                status: 'error',
                error_message: error.message || 'Unknown error'
            })
            .eq('id', documentId);

        throw error;
    }
}

// Search for similar chunks using vector similarity
export async function searchSimilarChunks(
    chatbotId: string,
    query: string,
    topK: number = 5,
    apiKey?: string,
    provider?: string
): Promise<{ content: string; similarity: number; page_url?: string; page_title?: string; source_type?: string }[]> {
    try {
        // Generate embedding for the query (use same method as document embeddings)
        const queryEmbedding = await generateEmbedding(query, apiKey, provider);

        // Try the new function with source metadata first
        const { data, error } = await supabaseAdmin.rpc('search_similar_chunks_with_source', {
            p_chatbot_id: chatbotId,
            p_embedding: queryEmbedding,
            p_limit: topK
        });

        if (error) {
            console.error('Vector search error:', error);
            // Fallback to original function or direct query
            const { data: fallbackData, error: fallbackError } = await supabaseAdmin.rpc('search_similar_chunks', {
                p_chatbot_id: chatbotId,
                p_embedding: queryEmbedding,
                p_limit: topK
            });

            if (fallbackError) {
                // Final fallback: just get the most recent chunks without similarity
                const { data: directData } = await supabaseAdmin
                    .from('document_chunks')
                    .select('content, page_url, page_title, source_type')
                    .eq('chatbot_id', chatbotId)
                    .limit(topK);

                return (directData || []).map(chunk => ({
                    content: chunk.content,
                    similarity: 0,
                    page_url: chunk.page_url,
                    page_title: chunk.page_title,
                    source_type: chunk.source_type
                }));
            }

            return fallbackData || [];
        }

        return data || [];
    } catch (error) {
        console.error('Error searching similar chunks:', error);
        return [];
    }
}

// Process a website page into chunks with embeddings
export async function processWebsitePage(
    pageId: string,
    url: string,
    title: string,
    content: string,
    chatbotId: string
): Promise<void> {
    try {
        console.log(`Processing website page: ${url}`);

        if (!content || content.trim().length === 0) {
            console.log(`Skipping ${url} - no content`);
            return;
        }

        // Chunk the text
        const chunks = chunkText(content);

        if (chunks.length === 0) {
            console.log(`Skipping ${url} - no chunks created`);
            return;
        }

        console.log(`Created ${chunks.length} chunks for ${url}`);

        // Get chatbot to retrieve API key and provider for embeddings
        const { data: chatbot } = await supabaseAdmin
            .from('chatbots')
            .select('api_key, llm_provider')
            .eq('id', chatbotId)
            .single();

        let decryptedApiKey: string | undefined;
        if (chatbot?.api_key) {
            try {
                decryptedApiKey = decrypt(chatbot.api_key);
            } catch (e) {
                console.warn('Could not decrypt API key for website page:', e);
            }
        }

        // Generate embeddings and store chunks
        const chunkRecords = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`Generating embedding for chunk ${i + 1}/${chunks.length} of ${url}`);

            const embedding = await generateEmbedding(chunk, decryptedApiKey, chatbot?.llm_provider);

            chunkRecords.push({
                chatbot_id: chatbotId,
                content: chunk,
                embedding: embedding,
                chunk_index: i,
                token_count: Math.ceil(chunk.length / 4),
                source_type: 'website',
                website_page_id: pageId,
                page_url: url,
                page_title: title || url
            });
        }

        // Insert all chunks
        const { error: insertError } = await supabaseAdmin
            .from('document_chunks')
            .insert(chunkRecords);

        if (insertError) {
            throw insertError;
        }

        console.log(`Website page ${url} processed successfully with ${chunks.length} chunks`);

    } catch (error: any) {
        console.error(`Error processing website page ${url}:`, error);
        throw error;
    }
}
