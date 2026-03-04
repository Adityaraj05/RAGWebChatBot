-- MyWebChat Database Schema Updates
-- Run these SQL commands in your Supabase SQL Editor

-- =====================================================
-- WIDGET CUSTOMIZATION COLUMNS
-- =====================================================
-- Add new columns to chatbots table for widget customization

ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS widget_position VARCHAR(20) DEFAULT 'bottom-right';
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS widget_size VARCHAR(10) DEFAULT 'medium';
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS button_shape VARCHAR(10) DEFAULT 'circle';
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS widget_width INTEGER DEFAULT 380;
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS widget_height INTEGER DEFAULT 520;
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS font_family VARCHAR(50) DEFAULT 'Inter';
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS header_style VARCHAR(20) DEFAULT 'solid';
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS bubble_style VARCHAR(20) DEFAULT 'modern';
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(10) DEFAULT '#8B5CF6';
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS theme VARCHAR(10) DEFAULT 'dark';
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS show_avatar BOOLEAN DEFAULT true;
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS header_subtitle VARCHAR(100) DEFAULT 'Powered by AI';

-- =====================================================
-- ANALYTICS TABLES
-- =====================================================

-- Add columns to conversations table for analytics
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'open';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS page_url TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Create widget_events table for detailed tracking
CREATE TABLE IF NOT EXISTS widget_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID REFERENCES chatbots(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    visitor_id VARCHAR(50),
    event_type VARCHAR(50) NOT NULL,
    page_url TEXT,
    page_title TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create page_analytics table
CREATE TABLE IF NOT EXISTS page_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID REFERENCES chatbots(id) ON DELETE CASCADE,
    visitor_id VARCHAR(50),
    page_url TEXT NOT NULL,
    page_title TEXT,
    time_spent INTEGER DEFAULT 0,
    visit_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_widget_events_chatbot ON widget_events(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_widget_events_created ON widget_events(created_at);
CREATE INDEX IF NOT EXISTS idx_widget_events_type ON widget_events(event_type);
CREATE INDEX IF NOT EXISTS idx_page_analytics_chatbot ON page_analytics(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_page_analytics_url ON page_analytics(page_url);

-- Note: analytics_summary already exists as a table in your database.
-- If you need to update it, modify the existing table structure.
-- The dashboard will use the existing analytics_summary table.

-- Grant permissions (adjust based on your RLS policies)
-- Uncomment if needed:
-- GRANT SELECT ON analytics_summary TO authenticated;
-- GRANT ALL ON widget_events TO service_role;
-- GRANT ALL ON page_analytics TO service_role;

-- =====================================================
-- PROMPTS TABLE FOR PROMPT GALLERY
-- =====================================================

CREATE TABLE IF NOT EXISTS prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'Custom',
    content TEXT NOT NULL,
    is_ai_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_created ON prompts(created_at);

-- Grant permissions
-- GRANT ALL ON prompts TO service_role;
-- GRANT SELECT ON prompts TO authenticated;

-- =====================================================
-- RAG: DOCUMENTS AND VECTOR STORAGE
-- =====================================================

-- Enable pgvector extension (must be done in Supabase SQL Editor)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table for storing uploaded files metadata
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID REFERENCES chatbots(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    file_type VARCHAR(50),
    file_size INTEGER,
    storage_path TEXT,
    status VARCHAR(20) DEFAULT 'processing',
    chunk_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Document chunks table with vector embeddings
-- Using 384 dimensions for all-MiniLM-L6-v2 model
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chatbot_id UUID REFERENCES chatbots(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(384),
    chunk_index INTEGER,
    token_count INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_chatbot ON documents(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_document_chunks_chatbot ON document_chunks(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document ON document_chunks(document_id);

-- Vector similarity search index (requires pgvector extension)
-- Run this after enabling pgvector:
-- CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks 
--     USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Plan limits reference (stored in application, not database)
-- basic: 10 docs, 5MB total, 2MB max file
-- pro: 15 docs, 15MB total, 5MB max file
-- enterprise: 30 docs, 50MB total, 10MB max file

-- =====================================================
-- VECTOR SEARCH FUNCTION (requires pgvector extension)
-- =====================================================

-- Function to search for similar document chunks
-- Run this after enabling pgvector:
/*
CREATE OR REPLACE FUNCTION search_similar_chunks(
    p_chatbot_id UUID,
    p_embedding vector(384),
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    content TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.content,
        1 - (dc.embedding <=> p_embedding) as similarity
    FROM document_chunks dc
    WHERE dc.chatbot_id = p_chatbot_id
        AND dc.embedding IS NOT NULL
    ORDER BY dc.embedding <=> p_embedding
    LIMIT p_limit;
END;
$$;
*/

-- =====================================================
-- WEBSITE-AWARE CHATBOT: KNOWLEDGE BASE SOURCES
-- =====================================================

-- Add knowledge base type column to chatbots
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS knowledge_base_type VARCHAR(20) DEFAULT 'documents';
-- Values: 'documents' | 'website' | 'none'

-- Website source configuration table
CREATE TABLE IF NOT EXISTS website_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID REFERENCES chatbots(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    sitemap_url TEXT,
    input_type VARCHAR(20) DEFAULT 'url', -- 'url' (generate sitemap) or 'sitemap' (uploaded sitemap)
    last_crawl_at TIMESTAMP,
    crawl_status VARCHAR(20) DEFAULT 'pending', -- pending, crawling, completed, error
    page_count INTEGER DEFAULT 0,
    error_message TEXT,
    crawl_config JSONB DEFAULT '{}', -- max_pages, include/exclude patterns
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Individual pages from crawled website
CREATE TABLE IF NOT EXISTS website_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_source_id UUID REFERENCES website_sources(id) ON DELETE CASCADE,
    chatbot_id UUID REFERENCES chatbots(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    meta_description TEXT,
    content_hash VARCHAR(64), -- SHA-256 for change detection
    last_crawled_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending', -- pending, crawled, error
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(website_source_id, url)
);

-- Extend document_chunks with source type for website vs document content
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'document';
-- Values: 'document' | 'website'
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS website_page_id UUID REFERENCES website_pages(id) ON DELETE CASCADE;
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS page_url TEXT;
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS page_title TEXT;

-- Indexes for website tables
CREATE INDEX IF NOT EXISTS idx_website_sources_chatbot ON website_sources(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_website_sources_status ON website_sources(crawl_status);
CREATE INDEX IF NOT EXISTS idx_website_pages_source ON website_pages(website_source_id);
CREATE INDEX IF NOT EXISTS idx_website_pages_chatbot ON website_pages(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_website_pages_status ON website_pages(status);
CREATE INDEX IF NOT EXISTS idx_document_chunks_source_type ON document_chunks(source_type);
CREATE INDEX IF NOT EXISTS idx_document_chunks_page ON document_chunks(website_page_id);

-- Updated vector search function to include page metadata for navigation context
-- Run this after enabling pgvector:
/*
CREATE OR REPLACE FUNCTION search_similar_chunks_with_source(
    p_chatbot_id UUID,
    p_embedding vector(384),
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    content TEXT,
    similarity FLOAT,
    source_type VARCHAR(20),
    page_url TEXT,
    page_title TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.content,
        1 - (dc.embedding <=> p_embedding) as similarity,
        dc.source_type,
        dc.page_url,
        dc.page_title
    FROM document_chunks dc
    WHERE dc.chatbot_id = p_chatbot_id
        AND dc.embedding IS NOT NULL
    ORDER BY dc.embedding <=> p_embedding
    LIMIT p_limit;
END;
$$;
*/

-- =====================================================
-- INTENT DETECTION TABLES
-- =====================================================

-- Table to store detected intents for each chatbot
CREATE TABLE IF NOT EXISTS chatbot_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID REFERENCES chatbots(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    keywords TEXT[],
    color VARCHAR(10) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chatbot_intents_chatbot_id ON chatbot_intents(chatbot_id);

-- Add detected_intent_id to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS detected_intent_id UUID REFERENCES chatbot_intents(id) ON DELETE SET NULL;

-- Index for intent analytics queries
CREATE INDEX IF NOT EXISTS idx_messages_detected_intent ON messages(detected_intent_id) WHERE detected_intent_id IS NOT NULL;

-- Function to update intent message counts
CREATE OR REPLACE FUNCTION update_intent_message_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.detected_intent_id IS NOT NULL THEN
        UPDATE chatbot_intents 
        SET message_count = message_count + 1,
            updated_at = NOW()
        WHERE id = NEW.detected_intent_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update counts
DROP TRIGGER IF EXISTS trigger_update_intent_count ON messages;
CREATE TRIGGER trigger_update_intent_count
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_intent_message_count();

-- =====================================================
-- HUMAN CHAT SUPPORT TABLES
-- =====================================================

-- Add escalation rules to chatbots table
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS escalation_rules JSONB DEFAULT '[]';
-- Format: [{"name": "refund_questions", "description": "Billing, refunds, and payment issues", "brief_response": "I understand you have a billing question."}]

-- Conversations: track human support escalation
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS requires_human_support BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS human_support_status VARCHAR(20) DEFAULT 'none';
-- Values: 'none' | 'pending' | 'in_progress' | 'resolved'
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS escalation_reason TEXT;

-- Messages: track sender type for human agent messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_type VARCHAR(20) DEFAULT 'bot';
-- Values: 'user' | 'bot' | 'human_agent'
ALTER TABLE messages ADD COLUMN IF NOT EXISTS agent_name VARCHAR(100);

-- Index for efficient queries of escalated conversations
CREATE INDEX IF NOT EXISTS idx_conversations_human_support 
    ON conversations(chatbot_id, requires_human_support, human_support_status);
