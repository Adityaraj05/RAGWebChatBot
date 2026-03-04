// Plan-based limits for knowledge base
export const PLAN_LIMITS = {
    basic: {
        maxDocuments: 15,
        maxTotalSize: 20 * 1024 * 1024, // 20MB
        maxFileSize: 5 * 1024 * 1024,  // 2MB per file
        maxWebsitePages: 50,           // Website pages limit
        label: 'Basic'
    },
    pro: {
        maxDocuments: 20,
        maxTotalSize: 30 * 1024 * 1024, // 30MB
        maxFileSize: 10 * 1024 * 1024,   // 10MB per file
        maxWebsitePages: 100,           // Website pages limit
        label: 'Pro'
    },
    enterprise: {
        maxDocuments: 30,
        maxTotalSize: 50 * 1024 * 1024, // 50MB
        maxFileSize: 15 * 1024 * 1024,  // 15MB per file
        maxWebsitePages: 500,           // Website pages limit
        label: 'Enterprise'
    }
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

export function getPlanLimits(plan: string) {
    const normalizedPlan = plan?.toLowerCase() as PlanType;
    return PLAN_LIMITS[normalizedPlan] || PLAN_LIMITS.basic;
}

// Supported file types for upload
export const SUPPORTED_FILE_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'text/plain',
    'text/markdown'
] as const;

export const FILE_EXTENSIONS = {
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'text/plain': '.txt',
    'text/markdown': '.md'
} as const;

export function isValidFileType(mimeType: string): boolean {
    return SUPPORTED_FILE_TYPES.includes(mimeType as any);
}
