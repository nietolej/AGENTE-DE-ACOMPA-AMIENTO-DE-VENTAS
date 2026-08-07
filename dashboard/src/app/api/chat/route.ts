import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// Permitir tiempos de respuesta más largos para el Edge Function o Node.js
export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, dataContext } = await req.json();

  // Se crea un prompt del sistema inyectando el contexto de los KPIs de la vista actual
  const systemPrompt = `Eres el Agente Inteligente del Dashboard de Ventas. 
Tu rol es analizar y responder preguntas sobre los indicadores (KPIs) del cliente que el usuario está viendo actualmente.
Responde de manera profesional, analítica, directa y utilizando formato Markdown para listas, tablas o negritas. 
Si el usuario hace una pregunta abierta, ofrécele descubrimientos (insights) clave.

Aquí tienes los datos actuales del cliente en formato JSON para que los analices:
${JSON.stringify(dataContext, null, 2)}

Usa estos datos como la fuente de la verdad para tu análisis. No inventes números que no estén aquí.`;

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse();
}
