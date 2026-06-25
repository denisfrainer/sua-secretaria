import { z } from 'zod';

export const tools = {
    // ==========================================
    // 💾 TOOL: Salvar Dados do Lead
    // ==========================================
    save_lead_data: {
        description: 'Salva as informações capturadas do lead (nome, empresa, faturamento, dor). Chame isso sempre que o usuário fornecer qualquer um desses dados.',
        parameters: z.object({
            phone: z.string().describe('O número de telefone do lead (para identificação na base de dados)'),
            name: z.string().optional().describe('Nome do lead'),
            company: z.string().optional().describe('Nome da empresa'),
            revenue: z.union([z.string(), z.number()]).optional().describe('Faturamento total ou tamanho da equipe'),
            pain_point: z.string().optional().describe('O principal desafio ou dor relatada pelo cliente'),
        }),
        execute: async (args: any) => {
            console.log(`💾 [LEAD DATA CAPTURED]:`, args);
            
            try {
                const { supabaseAdmin } = await import('../supabase/admin');
                
                const updateData: any = {};
                if (args.name) updateData.nome = args.name;
                if (args.company) updateData.empresa = args.company;
                if (args.pain_point) updateData.dor_principal = args.pain_point;
                if (args.revenue) updateData.faturamento = args.revenue;
                // For structure safety, let's keep status 'em_conversacao'
                updateData.status = 'em_conversacao';

                const { error } = await supabaseAdmin
                    .from('leads_lobo')
                    .update(updateData)
                    .eq('telefone', args.phone);

                if (error) {
                    console.error('❌ Erro ao atualizar lead no Supabase:', error);
                    return { status: 'error', message: 'Falha ao salvar dados no banco.' };
                }

                return {
                    status: 'success',
                    message: 'Dados do lead registrados com sucesso no banco de dados. Obrigado.',
                };
            } catch (err) {
                 console.error('❌ Erro inesperado ao atualizar lead:', err);
                 return { status: 'error', message: 'Erro ao processar atualização' };
            }
        },
    },

    // ==========================================
    // 🚨 TOOL: Notificar Humano (Escalonamento)
    // ==========================================
    notify_human: {
        description: 'Aciona um humano caso o lead esteja irritado, use palavrões, peça expressamente por uma pessoa, ou apresente uma objeção insolúvel.',
        parameters: z.object({
            reason: z.string().describe('O motivo exacto pelo qual o suporte humano está sendo requisitado'),
            chat_history: z.string().optional().describe('Resumo curto da conversa até o momento'),
        }),
        execute: async (args: { reason: string; chat_history?: string }) => {
            console.log(`🚨 [HUMAN ESCALATION]: ${args.reason}`);
            return {
                status: 'escalated',
                message: 'Um especialista foi alertado e assumirá a conversa.',
            };
        },
    },

    // ==========================================
    // 📅 TOOL: Verificar Disponibilidade
    // ==========================================
    check_availability: {
        description: 'Verifica horários disponíveis na agenda do Google para a data e duração solicitadas.',
        parameters: z.object({
            date: z.string().describe('Data no formato ISO (YYYY-MM-DD)'),
            duration_minutes: z.number().describe('Duração do serviço em minutos'),
            owner_id: z.string().describe('ID do dono do negócio (passado no contexto)'),
        }),
        execute: async (args: { date: string; duration_minutes: number; owner_id: string }) => {
            console.log(`[GCAL_SYNC] Gemini check_availability for: ${args.date} (${args.duration_minutes}min)`);
            
            try {
                const { supabaseAdmin } = await import('../supabase/admin');
                const { google } = await import('googleapis');
                const { getGoogleAuthClient } = await import('../calendar/google');

                const { data: business } = await supabaseAdmin
                    .from('business_config')
                    .select('id, context_json')
                    .eq('owner_id', args.owner_id)
                    .single();

                if (!business || !(business.context_json as any).google_calendar) {
                    return { status: 'error', message: 'Agenda do Google não está conectada.' };
                }

                const authClient = await getGoogleAuthClient(business.id, business.context_json);
                const calendar = google.calendar({ version: 'v3', auth: authClient });

                const startOfDay = new Date(`${args.date}T00:00:00Z`);
                const endOfDay = new Date(`${args.date}T23:59:59Z`);

                const freeBusy = await calendar.freebusy.query({
                    requestBody: {
                        timeMin: startOfDay.toISOString(),
                        timeMax: endOfDay.toISOString(),
                        items: [{ id: 'primary' }],
                    }
                });

                const busySlots = freeBusy.data.calendars?.primary?.busy || [];
                console.log(`[GCAL_SYNC] ${busySlots.length} busy slots found for ${args.date}`);

                return {
                    status: 'success',
                    busy_slots: busySlots,
                    message: `Horários de abertura: 09:00 - 18:00. Ocupados: ${busySlots.map(b => `${b.start}-${b.end}`).join(', ')}`,
                };
            } catch (err) {
                console.error('[GCAL_SYNC] Tool error (check_availability):', err);
                return { status: 'error', message: 'Erro ao consultar agenda.' };
            }
        }
    },

    // ==========================================
    // 📝 TOOL: Reservar Agendamento
    // ==========================================
    book_appointment: {
        description: 'Cria um novo compromisso na agenda do Google após confirmar disponibilidade.',
        parameters: z.object({
            client_name: z.string().describe('Nome completo do cliente'),
            service_name: z.string().describe('Nome do serviço que será realizado'),
            start_time: z.string().describe('Data e hora de início no formato ISO (YYYY-MM-DDTHH:mm:ssZ)'),
            end_time: z.string().describe('Data e hora de término no formato ISO'),
            owner_id: z.string().describe('ID do dono do negócio'),
        }),
        execute: async (args: { client_name: string; service_name: string; start_time: string; end_time: string; owner_id: string }) => {
            console.log(`[GCAL_SYNC] Gemini booking request: ${args.client_name} - ${args.service_name} at ${args.start_time}`);

            try {
                const { supabaseAdmin } = await import('../supabase/admin');
                const { google } = await import('googleapis');
                const { getGoogleAuthClient } = await import('../calendar/google');

                const { data: business } = await supabaseAdmin
                    .from('business_config')
                    .select('id, context_json')
                    .eq('owner_id', args.owner_id)
                    .single();

                if (!business || !(business.context_json as any).google_calendar) {
                    return { status: 'error', message: 'Integração com Google Calendar pendente.' };
                }

                const authClient = await getGoogleAuthClient(business.id, business.context_json);
                const calendar = google.calendar({ version: 'v3', auth: authClient });

                const event = await calendar.events.insert({
                    calendarId: 'primary',
                    requestBody: {
                        summary: `AI: ${args.client_name} - ${args.service_name}`,
                        description: `Agendamento automático via assistente Eliza.`,
                        start: { dateTime: args.start_time },
                        end: { dateTime: args.end_time },
                    }
                });

                console.log(`[GCAL_SYNC] Appointment booked: ${event.data.id}`);
                return {
                    status: 'success',
                    message: 'Agendamento confirmado no Google Calendar com sucesso!',
                };
            } catch (err) {
                console.error('[GCAL_SYNC] Tool error (book_appointment):', err);
                return { status: 'error', message: 'Falha ao processar reserva.' };
            }
        }
    },
};