import { GoogleGenAI } from '@google/genai';
import { generatePrompt } from '../../../lib/agent/prompt';

export const runtime = 'edge';

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing Google Generative AI API Key' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ai = new GoogleGenAI({ apiKey });
  const { message } = await req.json();

  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash', // Using the standard or preview
      contents: message,
      config: {
        systemInstruction: generatePrompt("LP.Nexus", ""),
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
