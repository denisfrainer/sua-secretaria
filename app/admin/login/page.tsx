'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Mail, Lock, Loader2, AlertCircle, ChevronRight } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        console.log(`[Login] Submitting credentials - Email: ${email}`);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                console.error(`[Login] Supabase Auth Error:`, authError.message);
                setError('Credenciais inválidas. Por favor, tente novamente.');
                return;
            }

            console.log(`[Login] Success! User: ${data.user?.email}`);
            router.push('/admin/config');
            router.refresh();
        } catch (err) {
            console.error(`[Login] Unexpected Error:`, err);
            setError('Ocorreu um erro inesperado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#020202] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />

            <div className="w-full max-w-md space-y-8 z-10">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-block p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] shadow-2xl backdrop-blur-md mb-2">
                        <Image src="/assets/logo.png" width={48} height={48} alt="meatende.ai" className="opacity-80" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight text-white uppercase italic">Command Center</h1>
                        <p className="text-zinc-500 text-sm font-medium tracking-[0.2em] uppercase">Auth Access Required</p>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-[#0D0D0D] border border-white/[0.05] rounded-[32px] p-8 shadow-2xl backdrop-blur-xl relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-[32px] pointer-events-none" />
                    
                    <form onSubmit={handleLogin} className="space-y-6 relative">
                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm animate-in fade-in zoom-in duration-300">
                                <AlertCircle size={18} />
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest pl-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={18} />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-white/[0.02] border border-white/[0.05] rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.04] transition-all placeholder:text-zinc-700"
                                        placeholder="admin@meatende.ai"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest pl-1">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={18} />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-white/[0.02] border border-white/[0.05] rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.04] transition-all placeholder:text-zinc-700"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[12px] py-4 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-2 group/btn disabled:opacity-50 disabled:grayscale"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={18} />
                            ) : (
                                <>
                                    Establish Control
                                    <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] opacity-40">
                    &copy; 2026 meatende.ai · System secure
                </p>
            </div>
        </main>
    );
}
