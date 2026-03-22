import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { streamOpenRouter } from "@/lib/openrouter";
import { buildShotListPrompt } from "@/lib/prompts/shot-list";
import { shotListSchema } from "@/lib/api-schemas";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { success } = await checkRateLimit(userId);
  if (!success) return new Response("Too many requests", { status: 429 });

  const body = shotListSchema.safeParse(await req.json());
  if (!body.success) return new Response(body.error.message, { status: 400 });
  const { topic } = body.data;
  const script = body.data.script as { hook: string; body: string; cta: string };
  const segments = body.data.segments as Parameters<typeof buildShotListPrompt>[2];

  const prompt = buildShotListPrompt(topic, script, segments);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamOpenRouter({
          messages: [
            {
              role: "system",
              content:
                "You are a professional video director. Always respond with valid JSON only.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
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
