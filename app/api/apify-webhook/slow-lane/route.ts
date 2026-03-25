import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { GoogleGenAI } from '@google/genai';
import { cleanPhone } from '../../../../lib/prospector/scraper';
import { expandLinkContext } from '../../../../lib/wolf/link-expander';

// Estabilizado em gemini-2.5-flash para 2026
const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

export async function POST(req: Request) {
    try {
        const slowLaneLeads = await req.json();
        if (!Array.isArray(slowLaneLeads) || slowLaneLeads.length === 0) {
            return NextResponse.json({ message: 'Queue is empty.' });
        }

        const leadsToUpsert = [];
        console.log(`🧠 🐺 SLOW-LANE: Analisando ${slowLaneLeads.length} leads com Gemini 2.5 Flash...`);

        for (const item of slowLaneLeads) {
            const mainLink = item.externalUrl || "";
            let expandedData = "";

            // Link Expander: O diferencial do Lobo
            if (mainLink.includes('linktr.ee') || mainLink.includes('wa.me/message') || mainLink.includes('beacons.ai')) {
                expandedData = await expandLinkContext(mainLink);
            }

            const context = `
                BIO: ${item.biography || 'N/A'}
                MAIN_LINK: ${mainLink || 'N/A'}
                EXPANDED: ${expandedData}
                ALL_LINKS: ${JSON.stringify(item.externalUrls || [])}
            `;

            const prompt = `
                TASK: Extract the Brazilian WhatsApp number (E.164 format) and City from the Instagram context.
                
                CRITICAL RULES:
                1. Look at EXPANDED_CONTEXT first. It often contains 'DETECTED_PHONE' or numbers inside 'FINAL_URL'.
                2. If you see a number like '5511999999999' or '11999999999', it IS the lead's contact.
                3. For Brazilian numbers, always ensure the +55 prefix.
                4. Format output strictly as JSON: {"phone": "+55...", "city": "..."}.
                5. If no number is found in BIO, LINK, or EXPANDED, return {"phone": null, "city": null}.
                
                CONTEXT:
                ${context}
            `;

            const response = await client.models.generateContent({
                model: 'gemini-2.5-flash', // Modelo estável para 2026
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });

            const rawText = response.text ? response.text.trim() : '{"phone": null, "city": null}';

            try {
                const jsonString = rawText.replace(/```json|```/g, '').trim();
                const aiResult = JSON.parse(jsonString);

                if (aiResult.phone) {
                    const phone = cleanPhone(aiResult.phone);
                    if (phone && phone.length >= 12) {
                        console.log(`✅ [SUCESSO] Lead ${item.username}: ${phone}`);
                        leadsToUpsert.push({
                            phone,
                            name: item.fullName || item.username,
                            niche: item.businessCategoryName || 'Instagram Lead (IA)',
                            city: item.businessAddress?.city_name || aiResult.city || '',
                            website: item.externalUrl || null,
                            maps_url: `https://instagram.com/${item.username}`,
                            status: 'pending',
                            updated_at: new Date().toISOString()
                        });
                    } else {
                        console.log(`⚠️ [CURTO] Lead ${item.username}: Número ignorado (${phone})`);
                    }
                } else {
                    console.log(`❌ [FALHA] Lead ${item.username}: Sem contato detectado.`);
                }
            } catch (e) { continue; }
        }

        if (leadsToUpsert.length > 0) {
            const { error } = await supabaseAdmin
                .from('leads_lobo')
                .upsert(leadsToUpsert, { onConflict: 'phone', ignoreDuplicates: false });

            if (error) throw error;
        }

        console.log(`✅ 🐺 SLOW-LANE: ${leadsToUpsert.length} leads processados.`);
        return NextResponse.json({ status: 'success', saved: leadsToUpsert.length });

    } catch (err: any) {
        console.error('❌ ERRO:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}