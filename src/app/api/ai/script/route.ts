import { NextRequest } from "next/server";
import { streamOpenRouter } from "@/lib/openrouter";
import { buildScriptPrompt } from "@/lib/prompts/script";

export async function POST(req: NextRequest) {
  const { topic, pov, research, toneModifier, apiKey } = await req.json();

  if (!apiKey) return new Response("Missing API key", { status: 400 });
  if (!topic) return new Response("Missing topic", { status: 400 });

  const prompt = buildScriptPrompt(topic, pov ?? "", research ?? "", toneModifier ?? "");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamOpenRouter(apiKey, {
          messages: [
            {
              role: "system",
              content:
                "You are an expert short-form video scriptwriter. Always respond with valid JSON only.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.8,
          maxTokens: 2048,
        })) {
          const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`;
          controller.enqueue(encoder.encode(sseData));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const errorMsg = `data: ${JSON.stringify({ error: (err as Error).message })}\n\n`;
        controller.enqueue(encoder.encode(errorMsg));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
