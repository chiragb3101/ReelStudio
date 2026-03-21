import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { imageSchema } from "@/lib/api-schemas";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = imageSchema.safeParse(await req.json());
  if (!body.success) return new Response(body.error.message, { status: 400 });
  const { prompt } = body.data;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return new Response("OpenRouter API key not configured", { status: 500 });

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://reelstudio.app",
        "X-Title": "ReelStudio",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4",
        messages: [
          {
            role: "user",
            content: `Generate an image: ${prompt}`,
          },
        ],
        temperature: 0.9,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;

    let imageSrc: string | null = null;

    if (typeof content === "string") {
      const match = content.match(/!\[.*?\]\((data:image\/[^)]+)\)/);
      imageSrc = match?.[1] ?? null;
    } else if (Array.isArray(content)) {
      const imageBlock = content.find(
        (block: { type: string }) => block.type === "image"
      );
      if (imageBlock) {
        imageSrc = `data:${imageBlock.source?.media_type ?? "image/png"};base64,${imageBlock.source?.data}`;
      }
    }

    return NextResponse.json({ src: imageSrc });
  } catch (err) {
    return new Response((err as Error).message, { status: 500 });
  }
}
