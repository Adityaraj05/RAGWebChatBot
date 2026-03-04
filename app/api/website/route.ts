import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getPlanLimits } from '@/lib/plan-limits';
import {
    parseSitemap,
    fetchSitemap,
    generateSitemap,
    crawlWebsite
} from '@/lib/website-crawler';

// GET - Get website source status for a chatbot
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const chatbotId = searchParams.get('chatbotId');

        if (!chatbotId) {
            return NextResponse.json(
                { success: false, error: 'chatbotId is required' },
                { status: 400 }
            );
        }

        // Get website source
        const { data: source, error: sourceError } = await supabaseAdmin
            .from('website_sources')
            .select('*')
            .eq('chatbot_id', chatbotId)
            .single();

        if (sourceError && sourceError.code !== 'PGRST116') {
            throw sourceError;
        }

        if (!source) {
            return NextResponse.json({
                success: true,
                source: null,
                pages: [],
                usage: { pageCount: 0, maxPages: 0 }
            });
        }

        // Get pages
        const { data: pages, error: pagesError } = await supabaseAdmin
            .from('website_pages')
            .select('id, url, title, status, last_crawled_at, error_message')
            .eq('website_source_id', source.id)
            .order('created_at', { ascending: true });

        if (pagesError) {
            throw pagesError;
        }

        // Get plan limits
        const { data: chatbot } = await supabaseAdmin
            .from('chatbots')
            .select('plan')
            .eq('id', chatbotId)
            .single();

        const planLimits = getPlanLimits(chatbot?.plan || 'basic');

        return NextResponse.json({
            success: true,
            source,
            pages: pages || [],
            usage: {
                pageCount: pages?.length || 0,
                maxPages: (planLimits as any).maxWebsitePages || 50
            }
        });

    } catch (error: any) {
        console.error('Website GET error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch website source' },
            { status: 500 }
        );
    }
}

// POST - Start website indexing
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { chatbotId, url, sitemapContent, inputType = 'url' } = body;

        if (!chatbotId) {
            return NextResponse.json(
                { success: false, error: 'chatbotId is required' },
                { status: 400 }
            );
        }

        if (!url && !sitemapContent) {
            return NextResponse.json(
                { success: false, error: 'Either url or sitemapContent is required' },
                { status: 400 }
            );
        }

        // Get plan limits
        const { data: chatbot } = await supabaseAdmin
            .from('chatbots')
            .select('plan')
            .eq('id', chatbotId)
            .single();

        const planLimits = getPlanLimits(chatbot?.plan || 'basic');
        const maxPages = (planLimits as any).maxWebsitePages || 50;

        // Delete existing website source if any
        await supabaseAdmin
            .from('website_sources')
            .delete()
            .eq('chatbot_id', chatbotId);

        // Delete existing website chunks
        await supabaseAdmin
            .from('document_chunks')
            .delete()
            .eq('chatbot_id', chatbotId)
            .eq('source_type', 'website');

        // Create new website source
        const { data: source, error: sourceError } = await supabaseAdmin
            .from('website_sources')
            .insert({
                chatbot_id: chatbotId,
                url: url || '',
                input_type: inputType,
                crawl_status: 'pending',
                crawl_config: { maxPages }
            })
            .select()
            .single();

        if (sourceError) {
            throw sourceError;
        }

        // Update chatbot knowledge base type
        await supabaseAdmin
            .from('chatbots')
            .update({ knowledge_base_type: 'website' })
            .eq('id', chatbotId);

        // Get URLs to crawl
        let urlsToCrawl: string[] = [];

        if (inputType === 'sitemap' && sitemapContent) {
            // Parse uploaded sitemap
            urlsToCrawl = parseSitemap(sitemapContent);
        } else if (url) {
            // Try to fetch existing sitemap first
            const sitemapUrls = await fetchSitemap(url);

            if (sitemapUrls && sitemapUrls.length > 0) {
                urlsToCrawl = sitemapUrls;
            } else {
                // Generate sitemap by crawling
                urlsToCrawl = await generateSitemap(url, maxPages);
            }
        }

        if (urlsToCrawl.length === 0) {
            // Update status to error
            await supabaseAdmin
                .from('website_sources')
                .update({
                    crawl_status: 'error',
                    error_message: 'No URLs found to crawl'
                })
                .eq('id', source.id);

            return NextResponse.json({
                success: false,
                error: 'No URLs found to crawl'
            }, { status: 400 });
        }

        // Limit URLs by plan
        const limitedUrls = urlsToCrawl.slice(0, maxPages);

        // Start crawling (in background for production, sync for simplicity here)
        // Note: For production, this should be a background job
        crawlWebsite(source.id, chatbotId, limitedUrls, maxPages)
            .then(result => {
                console.log('Crawl completed:', result);
            })
            .catch(error => {
                console.error('Crawl failed:', error);
            });

        return NextResponse.json({
            success: true,
            source: {
                ...source,
                crawl_status: 'crawling'
            },
            urlsFound: limitedUrls.length,
            message: `Started indexing ${limitedUrls.length} pages`
        });

    } catch (error: any) {
        console.error('Website POST error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to start website indexing' },
            { status: 500 }
        );
    }
}

// DELETE - Remove website source and all associated data
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const websiteSourceId = searchParams.get('id');
        const chatbotId = searchParams.get('chatbotId');

        if (!websiteSourceId && !chatbotId) {
            return NextResponse.json(
                { success: false, error: 'Either id or chatbotId is required' },
                { status: 400 }
            );
        }

        // Delete by ID or chatbotId
        const deleteQuery = websiteSourceId
            ? supabaseAdmin.from('website_sources').delete().eq('id', websiteSourceId)
            : supabaseAdmin.from('website_sources').delete().eq('chatbot_id', chatbotId!);

        const { error: deleteError } = await deleteQuery;

        if (deleteError) {
            throw deleteError;
        }

        // Also delete associated chunks
        if (chatbotId) {
            await supabaseAdmin
                .from('document_chunks')
                .delete()
                .eq('chatbot_id', chatbotId)
                .eq('source_type', 'website');

            // Update chatbot knowledge base type
            await supabaseAdmin
                .from('chatbots')
                .update({ knowledge_base_type: 'documents' })
                .eq('id', chatbotId);
        }

        return NextResponse.json({
            success: true,
            message: 'Website source deleted successfully'
        });

    } catch (error: any) {
        console.error('Website DELETE error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to delete website source' },
            { status: 500 }
        );
    }
}
