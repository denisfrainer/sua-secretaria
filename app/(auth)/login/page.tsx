import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import GoogleLoginButton from '@/components/GoogleLoginButton';
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
        <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 antialiased selection:bg-indigo-100 font-outfit">
            {/* Show loading state if processing code exchange */}
            <Suspense fallback={null}>
                <LoginLoadingState />
            </Suspense>

            <div className="w-full max-w-sm flex flex-col gap-10">
                {/* BRAND HEADER */}
                <div className="flex flex-col items-center text-center gap-6">
                    <Link href="/">
                        <div className="w-16 h-16 rounded-3xl bg-white shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer">
                            <Image
                                src="/assets/robot.png"
                                width={40}
                                height={40}
                                alt="meatende.ai"
                                className="object-contain"
                            />
                        </div>
                    </Link>
                    <div className="flex flex-col gap-2">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                            Acesse sua conta
                        </h1>
                        <p className="text-base font-medium text-slate-500">
                            Login unificado via Google ou Magic Link.
                        </p>
                    </div>
                </div>

                {/* LOGIN FORM CARD */}
                <div className="bg-white rounded-[32px] p-8 shadow-md border border-slate-100/60">
                    <UnifiedAuthForm />
                </div>

                <div className="flex flex-col items-center gap-2 text-center opacity-40 mt-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        meatende.ai &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </main>
    );
}
