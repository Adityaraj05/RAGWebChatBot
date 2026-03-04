import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { refreshWebsite } from '@/lib/website-crawler';

// POST - Refresh website (re-crawl and update changed pages)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { websiteSourceId } = body;

        if (!websiteSourceId) {
            return NextResponse.json(
                { success: false, error: 'websiteSourceId is required' },
                { status: 400 }
            );
        }

        // Check if source exists
        const { data: source, error: sourceError } = await supabaseAdmin
            .from('website_sources')
            .select('*')
            .eq('id', websiteSourceId)
            .single();

        if (sourceError || !source) {
            return NextResponse.json(
                { success: false, error: 'Website source not found' },
                { status: 404 }
            );
        }

        // Check if already crawling
        if (source.crawl_status === 'crawling') {
            return NextResponse.json(
                { success: false, error: 'Crawl already in progress' },
                { status: 400 }
            );
        }

        // Start refresh in background
        refreshWebsite(websiteSourceId)
            .then(result => {
                console.log('Refresh completed:', result);
            })
            .catch(error => {
                console.error('Refresh failed:', error);
            });

        return NextResponse.json({
            success: true,
            message: 'Refresh started',
            status: 'crawling'
        });

    } catch (error: any) {
        console.error('Website refresh error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to refresh website' },
            { status: 500 }
        );
    }
}
