import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Create a Supabase client for server-side auth operations
export function createServerClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                persistSession: false
            }
        }
    );
}

// Get current user session from cookies (server-side)
export async function getSession() {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
        return null;
    }

    const supabase = createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
        return null;
    }

    return { user, accessToken, refreshToken };
}

// Get current user ID (convenience helper)
export async function getCurrentUserId(): Promise<string | null> {
    const session = await getSession();
    return session?.user?.id || null;
}

// Check if user is authenticated (for middleware)
export async function isAuthenticated(): Promise<boolean> {
    const session = await getSession();
    return !!session;
}
