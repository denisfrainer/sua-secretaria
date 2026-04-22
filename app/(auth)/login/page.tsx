import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { LoginLoadingState } from '@/components/auth/LoginLoadingState';
import Link from 'next/link';
import UnifiedAuthForm from '@/components/auth/UnifiedAuthForm';

export default async function LoginPage() {
    // Server-side check to prevent logged-in users from seeing the login page
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        redirect('/dashboard');
    }

    return (
        <main className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-6 antialiased selection:bg-indigo-100 font-sans">
            {/* Show loading state if processing code exchange */}
            <Suspense fallback={null}>
                <LoginLoadingState />
            </Suspense>

            <div className="w-full max-w-sm">
                <Suspense fallback={
                    <div className="bg-white rounded-[32px] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 w-full min-h-[400px] flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 rounded-full border-4 border-indigo-50 border-t-indigo-600 animate-spin" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Carregando...</p>
                        </div>
                    </div>
                }>
                    <UnifiedAuthForm />
                </Suspense>

                <div className="flex flex-col items-center gap-2 text-center opacity-30 mt-10 font-bold uppercase tracking-widest text-[11px] text-slate-500">
                    Sua SecretarIA &copy; {new Date().getFullYear()}
                </div>
            </div>
        </main>
    );
}
