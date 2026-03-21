import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { prompt, apiKey } = await req.json();

  if (!apiKey) return new Response("Missing API key", { status: 400 });
  if (!prompt) return new Response("Missing prompt", { status: 400 });

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
