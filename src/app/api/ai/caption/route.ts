import { NextRequest } from "next/server";
import { streamOpenRouter } from "@/lib/openrouter";
import { buildCaptionPrompt } from "@/lib/prompts/caption";

export async function POST(req: NextRequest) {
  const { topic, script, toneModifier, apiKey } = await req.json();

  if (!apiKey) return new Response("Missing API key", { status: 400 });
  if (!topic || !script) return new Response("Missing required fields", { status: 400 });

  const prompt = buildCaptionPrompt(topic, script, toneModifier ?? "");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamOpenRouter(apiKey, {
          messages: [
            {
              role: "system",
              content:
                "You are an Instagram growth expert. Always respond with valid JSON only.",
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
