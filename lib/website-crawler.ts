import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

// Types for website crawling
export interface PageContent {
    url: string;
    title: string;
    description: string;
    content: string;
    html: string;
}

export interface CrawlResult {
    pagesFound: number;
    pagesCrawled: number;
    pagesErrored: number;
}

export interface RefreshResult {
    pagesUpdated: number;
    pagesSkipped: number;
    pagesErrored: number;
    totalPages: number;
}

// Rate limiting: delay between requests (ms)
const CRAWL_DELAY = 1000;

// Maximum pages per plan (fallback if not in config)
const DEFAULT_MAX_PAGES = 50;

// Maximum depth for link discovery
const MAX_CRAWL_DEPTH = 3;

/**
 * Parse sitemap XML content and extract all page URLs
 * Supports both sitemap.xml and sitemap_index.xml formats
 */
export function parseSitemap(sitemapContent: string, baseUrl?: string): string[] {
    const urls: string[] = [];

    // Check if it's a sitemap index (contains references to other sitemaps)
    const sitemapIndexMatches = sitemapContent.match(/<sitemap>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/sitemap>/gi);

    if (sitemapIndexMatches && sitemapIndexMatches.length > 0) {
        // This is a sitemap index - we'll just extract the sitemap URLs
        // In a full implementation, you'd recursively fetch these
        console.log('Detected sitemap index with', sitemapIndexMatches.length, 'child sitemaps');
        for (const match of sitemapIndexMatches) {
            const locMatch = match.match(/<loc>(.*?)<\/loc>/i);
            if (locMatch && locMatch[1]) {
                urls.push(locMatch[1].trim());
            }
        }
        return urls;
    }

    // Regular sitemap - extract all <loc> URLs
    const urlMatches = sitemapContent.match(/<url>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/url>/gi);

    if (urlMatches) {
        for (const match of urlMatches) {
            const locMatch = match.match(/<loc>(.*?)<\/loc>/i);
            if (locMatch && locMatch[1]) {
                let url = locMatch[1].trim();
                // Decode HTML entities
                url = url.replace(/&amp;/g, '&');
                urls.push(url);
            }
        }
    }

    // Fallback: try to find any <loc> tags directly
    if (urls.length === 0) {
        const directLocMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/gi);
        if (directLocMatches) {
            for (const match of directLocMatches) {
                const url = match.replace(/<\/?loc>/gi, '').trim().replace(/&amp;/g, '&');
                if (url.startsWith('http')) {
                    urls.push(url);
                }
            }
        }
    }

    return urls;
}

/**
 * Try to fetch sitemap from common locations
 * Recursively parses sitemap index files to get actual page URLs
 */
export async function fetchSitemap(baseUrl: string, maxDepth: number = 2): Promise<string[] | null> {
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const sitemapPaths = [
        '/sitemap.xml',
        '/sitemap_index.xml',
        '/sitemap-index.xml',
        '/sitemaps/sitemap.xml'
    ];

    for (const path of sitemapPaths) {
        try {
            const response = await fetch(`${cleanBaseUrl}${path}`, {
                headers: {
                    'User-Agent': 'MyWebChat-Bot/1.0 (Website Indexer)'
                }
            });

            if (response.ok) {
                const content = await response.text();
                if (content.includes('<urlset') || content.includes('<sitemapindex')) {
                    console.log(`Found sitemap at ${cleanBaseUrl}${path}`);
                    const urls = parseSitemap(content, cleanBaseUrl);

                    // Check if these are sitemap URLs (need recursive parsing)
                    const pageUrls: string[] = [];
                    const sitemapUrls: string[] = [];

                    for (const url of urls) {
                        if (url.endsWith('.xml') || url.includes('sitemap')) {
                            sitemapUrls.push(url);
                        } else {
                            pageUrls.push(url);
                        }
                    }

                    // If we found sitemap URLs, recursively fetch them
                    if (sitemapUrls.length > 0 && maxDepth > 0) {
                        console.log(`Found ${sitemapUrls.length} child sitemaps, parsing recursively...`);
                        for (const sitemapUrl of sitemapUrls) {
                            try {
                                const childResponse = await fetch(sitemapUrl, {
                                    headers: {
                                        'User-Agent': 'MyWebChat-Bot/1.0 (Website Indexer)'
                                    }
                                });

                                if (childResponse.ok) {
                                    const childContent = await childResponse.text();
                                    const childUrls = parseSitemap(childContent, cleanBaseUrl);

                                    // Filter out sitemap URLs from child results
                                    for (const childUrl of childUrls) {
                                        if (!childUrl.endsWith('.xml') && !childUrl.includes('sitemap')) {
                                            pageUrls.push(childUrl);
                                        }
                                    }
                                }

                                // Rate limit between sitemap fetches
                                await new Promise(resolve => setTimeout(resolve, 200));
                            } catch (error) {
                                console.log(`Failed to fetch child sitemap ${sitemapUrl}`);
                            }
                        }
                    }

                    console.log(`Extracted ${pageUrls.length} page URLs from sitemaps`);
                    return pageUrls.length > 0 ? pageUrls : null;
                }
            }
        } catch (error) {
            console.log(`Failed to fetch sitemap from ${cleanBaseUrl}${path}`);
        }
    }

    return null;
}

/**
 * Extract internal links from HTML page
 */
export function extractLinks(html: string, baseUrl: string): string[] {
    const links: Set<string> = new Set();
    const baseUrlObj = new URL(baseUrl);
    const baseDomain = baseUrlObj.hostname;

    // Match all href attributes
    const hrefMatches = html.match(/href=["'](.*?)["']/gi);

    if (hrefMatches) {
        for (const match of hrefMatches) {
            let href = match.replace(/href=["']/i, '').replace(/["']$/, '');

            // Skip anchors, mailto, tel, javascript
            if (href.startsWith('#') || href.startsWith('mailto:') ||
                href.startsWith('tel:') || href.startsWith('javascript:')) {
                continue;
            }

            try {
                // Convert relative URLs to absolute
                const absoluteUrl = new URL(href, baseUrl);

                // Only include same-domain links
                if (absoluteUrl.hostname === baseDomain) {
                    // Clean the URL (remove hash, keep path)
                    absoluteUrl.hash = '';
                    const cleanUrl = absoluteUrl.href;

                    // Skip common non-content URLs
                    if (!cleanUrl.match(/\.(jpg|jpeg|png|gif|svg|css|js|pdf|zip|ico|woff|woff2|ttf)$/i)) {
                        links.add(cleanUrl);
                    }
                }
            } catch {
                // Invalid URL, skip
            }
        }
    }

    return Array.from(links);
}

/**
 * Generate sitemap by crawling from homepage
 * Discovers all internal pages up to MAX_CRAWL_DEPTH
 */
export async function generateSitemap(
    baseUrl: string,
    maxPages: number = DEFAULT_MAX_PAGES
): Promise<string[]> {
    const discovered: Set<string> = new Set();
    const queue: { url: string; depth: number }[] = [];
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');

    // Start with homepage
    queue.push({ url: cleanBaseUrl, depth: 0 });
    discovered.add(cleanBaseUrl);

    while (queue.length > 0 && discovered.size < maxPages) {
        const { url, depth } = queue.shift()!;

        if (depth >= MAX_CRAWL_DEPTH) continue;

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'MyWebChat-Bot/1.0 (Website Indexer)'
                }
            });

            if (!response.ok) continue;

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('text/html')) continue;

            const html = await response.text();
            const links = extractLinks(html, url);

            for (const link of links) {
                if (!discovered.has(link) && discovered.size < maxPages) {
                    discovered.add(link);
                    queue.push({ url: link, depth: depth + 1 });
                }
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, CRAWL_DELAY));
        } catch (error) {
            console.log(`Error crawling ${url}:`, error);
        }
    }

    return Array.from(discovered);
}

/**
 * Extract content from a single page
 */
export async function extractPageContent(url: string): Promise<PageContent> {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'MyWebChat-Bot/1.0 (Website Indexer)'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i)
        || html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : '';

    // Extract main content (remove scripts, styles, nav, footer, etc.)
    let content = html;

    // Remove script and style tags
    content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
    content = content.replace(/<style[\s\S]*?<\/style>/gi, '');
    content = content.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

    // Remove common non-content elements
    content = content.replace(/<nav[\s\S]*?<\/nav>/gi, '');
    content = content.replace(/<header[\s\S]*?<\/header>/gi, '');
    content = content.replace(/<footer[\s\S]*?<\/footer>/gi, '');
    content = content.replace(/<aside[\s\S]*?<\/aside>/gi, '');

    // Try to find main content area
    const mainMatch = content.match(/<main[\s\S]*?>([\s\S]*?)<\/main>/i)
        || content.match(/<article[\s\S]*?>([\s\S]*?)<\/article>/i)
        || content.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
        || content.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i);

    if (mainMatch) {
        content = mainMatch[1];
    }

    // Remove all HTML tags
    content = content.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    content = content
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&[a-z]+;/gi, ' ');

    // Clean up whitespace
    content = content.replace(/\s+/g, ' ').trim();

    return {
        url,
        title,
        description,
        content,
        html
    };
}

/**
 * Compute SHA-256 hash of content for change detection
 */
export function computeContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

/**
 * Sleep helper for rate limiting
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main function to crawl a website and store content
 */
export async function crawlWebsite(
    websiteSourceId: string,
    chatbotId: string,
    urls: string[],
    maxPages?: number
): Promise<CrawlResult> {
    const result: CrawlResult = {
        pagesFound: urls.length,
        pagesCrawled: 0,
        pagesErrored: 0
    };

    const pagesToCrawl = maxPages ? urls.slice(0, maxPages) : urls;

    // Update status to crawling
    await supabaseAdmin
        .from('website_sources')
        .update({ crawl_status: 'crawling' })
        .eq('id', websiteSourceId);

    for (const url of pagesToCrawl) {
        try {
            console.log(`Crawling: ${url}`);

            // Extract page content
            const pageContent = await extractPageContent(url);
            const contentHash = computeContentHash(pageContent.content);

            // Insert or update page record
            const { data: pageData, error: pageError } = await supabaseAdmin
                .from('website_pages')
                .upsert({
                    website_source_id: websiteSourceId,
                    chatbot_id: chatbotId,
                    url: url,
                    title: pageContent.title,
                    meta_description: pageContent.description,
                    content_hash: contentHash,
                    last_crawled_at: new Date().toISOString(),
                    status: 'crawled',
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'website_source_id,url'
                })
                .select()
                .single();

            if (pageError) {
                console.error(`Error saving page ${url}:`, pageError);
                result.pagesErrored++;
                continue;
            }

            // Process content into chunks with embeddings
            const { processWebsitePage } = await import('@/lib/document-processor');
            await processWebsitePage(
                pageData.id,
                url,
                pageContent.title,
                pageContent.content,
                chatbotId
            );

            result.pagesCrawled++;

            // Rate limiting
            await sleep(CRAWL_DELAY);

        } catch (error: any) {
            console.error(`Error processing ${url}:`, error);

            // Record error for this page
            await supabaseAdmin
                .from('website_pages')
                .upsert({
                    website_source_id: websiteSourceId,
                    chatbot_id: chatbotId,
                    url: url,
                    status: 'error',
                    error_message: error.message || 'Unknown error',
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'website_source_id,url'
                });

            result.pagesErrored++;
        }
    }

    // Update final status
    await supabaseAdmin
        .from('website_sources')
        .update({
            crawl_status: result.pagesErrored === result.pagesFound ? 'error' : 'completed',
            page_count: result.pagesCrawled,
            last_crawl_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', websiteSourceId);

    // Auto-detect intents after successful website crawl
    if (result.pagesCrawled > 0) {
        try {
            const { triggerIntentDetection } = await import('@/lib/intent-detector');
            await triggerIntentDetection(chatbotId);
            console.log(`[Intent] Auto-detected intents after website crawl for chatbot ${chatbotId}`);
        } catch (intentError) {
            console.log('[Intent] Auto-detection after crawl skipped:', intentError);
        }
    }

    return result;
}

/**
 * Refresh website: re-crawl and only update changed pages
 * Uses content hash to detect changes and skip unchanged pages
 */
export async function refreshWebsite(websiteSourceId: string): Promise<RefreshResult> {
    const result: RefreshResult = {
        pagesUpdated: 0,
        pagesSkipped: 0,
        pagesErrored: 0,
        totalPages: 0
    };

    // Get website source info
    const { data: source, error: sourceError } = await supabaseAdmin
        .from('website_sources')
        .select('*, chatbot_id')
        .eq('id', websiteSourceId)
        .single();

    if (sourceError || !source) {
        throw new Error('Website source not found');
    }

    // Get all pages for this source
    const { data: pages, error: pagesError } = await supabaseAdmin
        .from('website_pages')
        .select('*')
        .eq('website_source_id', websiteSourceId);

    if (pagesError) {
        throw new Error('Failed to fetch pages');
    }

    result.totalPages = pages?.length || 0;

    // Update status to crawling
    await supabaseAdmin
        .from('website_sources')
        .update({ crawl_status: 'crawling' })
        .eq('id', websiteSourceId);

    for (const page of pages || []) {
        try {
            console.log(`Refreshing: ${page.url}`);

            // Fetch current content
            const pageContent = await extractPageContent(page.url);
            const newHash = computeContentHash(pageContent.content);

            // Compare with stored hash
            if (page.content_hash === newHash) {
                console.log(`Skipping ${page.url} - content unchanged`);
                result.pagesSkipped++;

                // Update last crawled timestamp
                await supabaseAdmin
                    .from('website_pages')
                    .update({ last_crawled_at: new Date().toISOString() })
                    .eq('id', page.id);

                await sleep(CRAWL_DELAY);
                continue;
            }

            console.log(`Content changed for ${page.url} - re-indexing`);

            // Delete old chunks for this page
            await supabaseAdmin
                .from('document_chunks')
                .delete()
                .eq('website_page_id', page.id);

            // Update page record
            await supabaseAdmin
                .from('website_pages')
                .update({
                    title: pageContent.title,
                    meta_description: pageContent.description,
                    content_hash: newHash,
                    last_crawled_at: new Date().toISOString(),
                    status: 'crawled',
                    updated_at: new Date().toISOString()
                })
                .eq('id', page.id);

            // Re-process content
            const { processWebsitePage } = await import('@/lib/document-processor');
            await processWebsitePage(
                page.id,
                page.url,
                pageContent.title,
                pageContent.content,
                source.chatbot_id
            );

            result.pagesUpdated++;
            await sleep(CRAWL_DELAY);

        } catch (error: any) {
            console.error(`Error refreshing ${page.url}:`, error);
            result.pagesErrored++;

            await supabaseAdmin
                .from('website_pages')
                .update({
                    status: 'error',
                    error_message: error.message || 'Refresh failed'
                })
                .eq('id', page.id);
        }
    }

    // Update final status
    await supabaseAdmin
        .from('website_sources')
        .update({
            crawl_status: 'completed',
            last_crawl_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', websiteSourceId);

    return result;
}
