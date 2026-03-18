import { GoogleGenAI } from '@google/genai';

export const runtime = 'edge';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  const { message } = await req.json();

  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.1-flash-lite-preview', // Using the standard or preview
      contents: message,
      config: {
        systemInstruction: `Seu nome é AGENTE. Você opera sob o protocolo ELIZA (1966). Responda em Português Brasileiro. Mantenha o estilo: 'COMO VOCÊ ESTÁ. POR FAVOR, DIGA-ME O SEU PROBLEMA.' Use CAIXA ALTA (All-caps) para as respostas da IA para reforçar a estética de terminal antigo.`,
      }
    });

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of responseStream) {
          if (chunk.text) {
            controller.enqueue(new TextEncoder().encode(chunk.text));
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error generating streaming response:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate response' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}