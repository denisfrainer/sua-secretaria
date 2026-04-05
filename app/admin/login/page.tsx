'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Mail, Lock, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import GoogleLoginButton from '@/components/GoogleLoginButton';

/**
 * LoginPage: Admin Authentication
 * Strict Constraints:
 * - Typography: Source Sans 3 (base size 16px)
 * - Background: bg-white (#ffffff)
 * - Copywriting: "Bem-vindo, usuário"
 * - Primary Button: bg-blue-600
 * - Logging: Strategic console instrumentation
 */
export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [codeProcessing, setCodeProcessing] = useState(false);
    const supabase = createClient();
    const router = useRouter();

    // Deprecated: Client-side routing removed to prevent Service Worker PKCE collisions

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // STRATEGIC LOGGING: START
        console.log(`📡 [AUTH] Initiating login attempt for email: ${email}`);

        try {
            console.log(`📡 [AUTH] Requesting Supabase signInWithPassword...`);
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                console.error(`❌ [AUTH ERROR] Supabase rejected credentials:`, authError.message);
                setError('Credenciais inválidas. Por favor, tente novamente.');
                setLoading(false);
                return;
            }

            console.log(`✅ [AUTH] Login successful! Session granted for: ${data.user?.email}`);
            console.log(`🚀 [AUTH] Redirecting to: /admin/config`);
            
            router.push('/admin/config');
            router.refresh();
        } catch (err) {
            console.error(`❌ [AUTH ERROR] Unexpected exception during login flow:`, err);
            setError('Ocorreu um erro inesperado.');
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-white text-zinc-900 flex flex-col items-center justify-center p-6 font-source antialiased selection:bg-blue-100">
            <div className="w-full max-w-sm flex flex-col gap-10">
                
                {/* BRAND HEADER */}
                <div className="flex flex-col items-center text-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-white shadow-xl shadow-zinc-200 border border-zinc-100 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
                        <Image 
                            src="/assets/robot.png" 
                            width={40} 
                            height={40} 
                            alt="meatende.ai" 
                            className="object-contain"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
                            Bem-vindo, usuário
                        </h1>
                        <p className="text-base font-medium text-zinc-500">
                            Central de Controle meatende.ai
                        </p>
                    </div>
                </div>

                {/* LOGIN FORM CARD */}
                <div className="bg-[#fafafa] rounded-[32px] p-8 border border-zinc-100 shadow-sm">
                    {codeProcessing ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <Loader2 className="animate-spin text-blue-600" size={32} />
                            <p className="text-zinc-500 font-medium text-sm">Autenticando sessão segura...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            
                            <div className="w-full">
                                <GoogleLoginButton />
                            </div>

                            <div className="relative flex items-center justify-center">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-zinc-200"></div>
                                </div>
                                <div className="relative bg-[#fafafa] px-4 text-xs font-bold uppercase tracking-widest text-zinc-400">
                                    ou admin
                                </div>
                            </div>

                            <form onSubmit={handleLogin} className="flex flex-col gap-6">
                        
                        {error && (
                            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm animate-in slide-in-from-top-2 duration-300">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <p className="font-bold leading-tight">{error}</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-5">
                            {/* EMAIL INPUT */}
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-zinc-400 uppercase tracking-widest ml-1">
                                    Login de Acesso
                                </label>
                                <div className="group relative">
                                    <Mail 
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-blue-600 transition-colors" 
                                        size={20} 
                                    />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-white border border-zinc-200 rounded-2xl py-4 pl-12 pr-4 text-base font-bold text-zinc-900 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all placeholder:text-zinc-300"
                                        placeholder="seu@email.com"
                                    />
                                </div>
                            </div>

                            {/* PASSWORD INPUT */}
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-zinc-400 uppercase tracking-widest ml-1">
                                    Chave de Segurança
                                </label>
                                <div className="group relative">
                                    <Lock 
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-blue-600 transition-colors" 
                                        size={20} 
                                    />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-white border border-zinc-200 rounded-2xl py-4 pl-12 pr-4 text-base font-bold text-zinc-900 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all placeholder:text-zinc-300"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ACTION BUTTON */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-4 py-2 bg-slate-900 text-white rounded-md shadow-sm text-[16px] font-medium transition-all duration-200 ease-in-out hover:bg-slate-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 flex items-center justify-center gap-2 disabled:opacity-70 disabled:grayscale"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <span>Acessar Painel</span>
                                </>
                            )}
                        </button>
                    </form>
                    </div>
                )}
                </div>

                <div className="flex flex-col items-center gap-2 text-center opacity-40">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                        meatende.ai &copy; 2026
                    </p>
                    <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-[0.25em]">
                        Surgically Built for Peak Performance
                    </p>
                </div>
            </div>
        </main>
    );
}
