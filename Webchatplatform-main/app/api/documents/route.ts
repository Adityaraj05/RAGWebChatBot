import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { getPlanLimits, isValidFileType, SUPPORTED_FILE_TYPES } from '@/lib/plan-limits';
import { processDocument } from '@/lib/document-processor';

// GET - List documents for a chatbot
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const chatbotId = searchParams.get('chatbotId');

        if (!chatbotId) {
            return NextResponse.json(
                { success: false, error: 'chatbotId is required' },
                { status: 400 }
            );
        }

        // Get chatbot to verify it exists and get plan
        const { data: chatbot, error: chatbotError } = await supabase
            .from('chatbots')
            .select('id, plan')
            .eq('id', chatbotId)
            .single();

        if (chatbotError || !chatbot) {
            return NextResponse.json(
                { success: false, error: 'Chatbot not found' },
                { status: 404 }
            );
        }

        // Get all documents for this chatbot
        const { data: documents, error: docsError } = await supabase
            .from('documents')
            .select('*')
            .eq('chatbot_id', chatbotId)
            .order('created_at', { ascending: false });

        if (docsError) {
            throw docsError;
        }

        // Calculate usage stats
        const planLimits = getPlanLimits(chatbot.plan || 'basic');
        const totalSize = documents?.reduce((sum, doc) => sum + (doc.file_size || 0), 0) || 0;
        const documentCount = documents?.length || 0;

        return NextResponse.json({
            success: true,
            documents: documents || [],
            usage: {
                documentCount,
                maxDocuments: planLimits.maxDocuments,
                totalSize,
                maxTotalSize: planLimits.maxTotalSize,
                maxFileSize: planLimits.maxFileSize,
                plan: chatbot.plan || 'basic'
            }
        });
    } catch (err) {
        console.error('Error fetching documents:', err);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST - Upload new document
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const chatbotId = formData.get('chatbotId') as string;

        if (!file || !chatbotId) {
            return NextResponse.json(
                { success: false, error: 'File and chatbotId are required' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!isValidFileType(file.type)) {
            return NextResponse.json(
                { success: false, error: `Unsupported file type. Allowed: PDF, DOCX, TXT, MD` },
                { status: 400 }
            );
        }

        // Get chatbot to verify and get plan
        const { data: chatbot, error: chatbotError } = await supabase
            .from('chatbots')
            .select('id, plan')
            .eq('id', chatbotId)
            .single();

        if (chatbotError || !chatbot) {
            return NextResponse.json(
                { success: false, error: 'Chatbot not found' },
                { status: 404 }
            );
        }

        const planLimits = getPlanLimits(chatbot.plan || 'basic');

        // Check file size limit
        if (file.size > planLimits.maxFileSize) {
            return NextResponse.json({
                success: false,
                error: `File too large. Max size: ${planLimits.maxFileSize / (1024 * 1024)}MB`
            }, { status: 400 });
        }

        // Get existing documents to check limits
        const { data: existingDocs } = await supabase
            .from('documents')
            .select('file_size')
            .eq('chatbot_id', chatbotId);

        const currentDocCount = existingDocs?.length || 0;
        const currentTotalSize = existingDocs?.reduce((sum, doc) => sum + (doc.file_size || 0), 0) || 0;

        // Check document count limit
        if (currentDocCount >= planLimits.maxDocuments) {
            return NextResponse.json({
                success: false,
                error: `Document limit reached. Max: ${planLimits.maxDocuments} documents`
            }, { status: 400 });
        }

        // Check total size limit
        if (currentTotalSize + file.size > planLimits.maxTotalSize) {
            return NextResponse.json({
                success: false,
                error: `Storage limit exceeded. Max: ${planLimits.maxTotalSize / (1024 * 1024)}MB total`
            }, { status: 400 });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `documents/${chatbotId}/${timestamp}_${safeFilename}`;

        // Upload file to Supabase storage
        const fileBuffer = await file.arrayBuffer();
        const { error: uploadError } = await supabaseAdmin.storage
            .from('knowledge-base')
            .upload(storagePath, fileBuffer, {
                contentType: file.type,
                upsert: false
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            // Continue anyway - we'll store the file content in the database
        }

        // Create document record
        const { data: document, error: docError } = await supabaseAdmin
            .from('documents')
            .insert({
                chatbot_id: chatbotId,
                filename: safeFilename,
                original_filename: file.name,
                file_type: file.type,
                file_size: file.size,
                storage_path: storagePath,
                status: 'processing'
            })
            .select()
            .single();

        if (docError) {
            throw docError;
        }

        // Process document asynchronously (extract text, chunk, embed)
        // This runs in the background
        processDocument(document.id, fileBuffer, file.type, chatbotId)
            .then(() => console.log(`Document ${document.id} processed successfully`))
            .catch((err) => console.error(`Document ${document.id} processing failed:`, err));

        return NextResponse.json({
            success: true,
            document: document,
            message: 'Document uploaded. Processing in background...'
        });
    } catch (err) {
        console.error('Error uploading document:', err);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE - Delete document
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const documentId = searchParams.get('id');

        if (!documentId) {
            return NextResponse.json(
                { success: false, error: 'Document ID is required' },
                { status: 400 }
            );
        }

        // Get document to find storage path
        const { data: document, error: docError } = await supabase
            .from('documents')
            .select('storage_path')
            .eq('id', documentId)
            .single();

        if (docError || !document) {
            return NextResponse.json(
                { success: false, error: 'Document not found' },
                { status: 404 }
            );
        }

        // Delete from storage (if path exists)
        if (document.storage_path) {
            await supabaseAdmin.storage
                .from('knowledge-base')
                .remove([document.storage_path]);
        }

        // Delete document (cascades to chunks)
        const { error: deleteError } = await supabaseAdmin
            .from('documents')
            .delete()
            .eq('id', documentId);

        if (deleteError) {
            throw deleteError;
        }

        return NextResponse.json({
            success: true,
            message: 'Document deleted successfully'
        });
    } catch (err: unknown) {
        console.error('Error deleting document:', err);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
