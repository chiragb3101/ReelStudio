import { NextRequest } from "next/server";
import { streamOpenRouter } from "@/lib/openrouter";
import { buildEditSpecPrompt } from "@/lib/prompts/edit-spec";

export async function POST(req: NextRequest) {
  const { topic, script, clips, tone, template, segments, apiKey } = await req.json();

  if (!apiKey) return new Response("Missing API key", { status: 400 });
  if (!topic || !script) return new Response("Missing required fields", { status: 400 });

  const prompt = buildEditSpecPrompt(topic, script, clips ?? [], tone ?? "casual", template ?? "full-video-overlay", segments);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamOpenRouter(apiKey, {
          messages: [
            {
              role: "system",
              content:
                "You are a professional video editor. Respond with valid JSON only matching the exact schema requested. No markdown fences, no explanation — just the JSON object.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          maxTokens: 6000,
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
