import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export default async function OnboardingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    console.log('[ONBOARDING_MOUNT] Rendering onboarding page for user:', user.id);

    async function handleOnboarding(formData: FormData) {
        'use server';
        
        const userId = user?.id; // user is available from the closure
        if (!userId) throw new Error('User not authenticated');

        const businessName = formData.get('business_name') as string;
        const niche = formData.get('niche') as string;

        // Default payloads based on niche
        const nichePrompts: Record<string, string> = {
            'Manicures': 'You are a polite virtual assistant for a professional manicure salon. Your main goal is to help clients schedule nail services (manicure, pedicure, gel nails) and answer questions about availability and colors. Be professional and inviting.',
            'Estheticians': 'You are a professional assistant for an esthetician clinic. Focus on scheduling facial treatments, massages, and skin care consultations. Be empathetic, professional, and explain the benefits of each procedure clearly.',
            'Hair Salons': 'You are a friendly and stylish assistant for a hair salon. Help clients book cuts, coloring, and treatments. Mention our expert stylists and ensure they find the best time for their hair transformation.',
            'Eyebrows': 'You are a detail-oriented assistant for an eyebrow and lash studio. Help clients book design, microblading, or lash lifting services. Emphasize precision, beauty, and the expertise of our technicians.'
        };

        const systemPrompt = nichePrompts[niche] || 'You are a polite virtual assistant for a beauty business. Focus on scheduling services and answering client questions.';

        const payload = {
            owner_id: userId,
            business_name: businessName,
            business_niche: niche,
            custom_rules: systemPrompt,
            context_json: {
                welcome_message: `Olá! Bem-vindo(a) à ${businessName}. Como posso ajudar você hoje?`,
                niche: niche
            },
            updated_at: new Date().toISOString()
        };

        console.log('[ONBOARDING_DB_CALL] Attempting to insert sanitized payload:', payload);

        const { error } = await supabaseAdmin
            .from('business_config')
            .upsert(payload, { onConflict: 'owner_id' });

        if (error) {
            console.error('[ONBOARDING_DB_ERROR] Supabase rejection details:', error);
            throw new Error(`Failed to save business config: ${error.message}`);
        }

        console.log('[ONBOARDING_SUCCESS] Business config saved successfully for user:', userId);
        redirect('/dashboard');
    }

    return (
        <main className="min-h-screen bg-[#FFFBFB] flex flex-col items-center justify-center p-6 antialiased font-outfit">
            <div className="w-full max-w-md flex flex-col gap-8">
                {/* Header */}
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-pink-50 flex items-center justify-center border-4 border-white shadow-lg">
                        <span className="text-3xl text-pink-400">✨</span>
                    </div>
                    <div className="flex flex-col gap-2">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-800">
                            Configure sua conta
                        </h1>
                        <p className="text-slate-500 font-medium">
                            Conte-nos um pouco sobre o seu negócio para personalizarmos sua IA.
                        </p>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-pink-50">
                    <form action={handleOnboarding} className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <label htmlFor="business_name" className="text-sm font-semibold text-slate-700 ml-1">
                                Nome do Negócio
                            </label>
                            <input
                                required
                                id="business_name"
                                name="business_name"
                                type="text"
                                placeholder="Ex: Studio Bela Unha"
                                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="niche" className="text-sm font-semibold text-slate-700 ml-1">
                                Seu Nicho
                            </label>
                            <div className="relative">
                                <select
                                    required
                                    id="niche"
                                    name="niche"
                                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:bg-white transition-all text-slate-800 appearance-none cursor-pointer"
                                >
                                    <option value="" disabled selected>Selecione um nicho...</option>
                                    <option value="Manicures">Manicure & Pedicure</option>
                                    <option value="Estheticians">Estética & Facial</option>
                                    <option value="Hair Salons">Salão de Cabeleireiro</option>
                                    <option value="Eyebrows">Sobrancelhas & Cílios</option>
                                </select>
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="mt-4 w-full bg-pink-500 hover:bg-pink-600 active:scale-[0.98] text-white font-bold py-5 rounded-2xl shadow-lg shadow-pink-200 transition-all flex items-center justify-center gap-2 group"
                        >
                            Finalizar Configuração
                            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                        </button>
                    </form>
                </div>

                <div className="text-center">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">
                        Sua SecretarIA &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </main>
    );
}
