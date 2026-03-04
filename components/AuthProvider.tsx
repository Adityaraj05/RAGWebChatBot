'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);

            // Set cookies for server-side auth
            if (session) {
                document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=3600; SameSite=Lax`;
                document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=604800; SameSite=Lax`;
            }

            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            // Update cookies
            if (session) {
                document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=3600; SameSite=Lax`;
                document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=604800; SameSite=Lax`;
            } else {
                document.cookie = 'sb-access-token=; path=/; max-age=0';
                document.cookie = 'sb-refresh-token=; path=/; max-age=0';
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error as Error | null };
        // Set cookies immediately so middleware sees them on the next request (fixes auth hydration race)
        if (data.session) {
            document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=3600; SameSite=Lax`;
            document.cookie = `sb-refresh-token=${data.session.refresh_token}; path=/; max-age=604800; SameSite=Lax`;
        }
        setSession(data.session);
        setUser(data.session?.user ?? null);
        return { error: null };
    };

    const signUp = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return { error: error as Error | null };
        if (data.session) {
            document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=3600; SameSite=Lax`;
            document.cookie = `sb-refresh-token=${data.session.refresh_token}; path=/; max-age=604800; SameSite=Lax`;
            setSession(data.session);
            setUser(data.session?.user ?? null);
        }
        return { error: null };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        document.cookie = 'sb-access-token=; path=/; max-age=0';
        document.cookie = 'sb-refresh-token=; path=/; max-age=0';
        router.replace('/login');
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
