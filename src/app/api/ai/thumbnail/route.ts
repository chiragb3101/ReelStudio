import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/openrouter";

export async function POST(req: NextRequest) {
  const { topic, hook, tone, apiKey, frames } = await req.json();

  if (!apiKey) return new Response("Missing API key", { status: 400 });
  if (!topic) return new Response("Missing topic", { status: 400 });

  // Build the prompt — include frame descriptions if available
  const frameContext = frames?.length
    ? `\n\nI've captured ${frames.length} frames from the recorded video clips. Use the visual style, colors, and energy from these frames to inform your thumbnail designs. Match the actual look and feel of the video content.`
    : "";

  const prompt = `You are a thumbnail designer for Instagram Reels. Design 3 different thumbnail covers.

Topic: ${topic}
Hook: ${hook || "N/A"}
Tone: ${tone || "casual"}${frameContext}

For each thumbnail, specify the visual design as JSON. Each design has a different style:
1. "Text-Dominant" — bold large text is the hero, minimal background
2. "Face-Forward" — emoji or icon as centerpiece with supporting text
3. "Scene-Based" — rich gradient background with layered text elements

Return ONLY valid JSON in this exact format (no markdown fences):
{
  "thumbnails": [
    {
      "style": "Text-Dominant",
      "headline": "3-6 word punchy headline",
      "subtext": "short supporting line (optional, can be empty)",
      "gradientFrom": "#hex color",
      "gradientVia": "#hex color or empty string",
      "gradientTo": "#hex color",
      "gradientAngle": 180,
      "textColor": "#hex",
      "subtextColor": "#hex",
      "emoji": "single relevant emoji",
      "accentShape": "circle" or "none" or "stripe"
    }
  ]
}

Design guidelines:
- Use vibrant, contrasting colors that pop on mobile
- Headlines should be scroll-stopping, max 6 words
- Match the ${tone} tone
- Each thumbnail should feel distinctly different
- Use modern Gen-Z aesthetic colors (neon purples, cyans, hot pinks, electric blues, lime greens)
${frames?.length ? "- Draw color inspiration from the video frames provided" : ""}`;

  try {
    // Build messages — include frames as image content if available
    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: "text", text: prompt },
    ];

    // Add up to 3 frames as images for the AI to reference
    if (frames?.length) {
      const framesToSend = frames.slice(0, 3);
      for (const frame of framesToSend) {
        userContent.push({
          type: "image_url",
          image_url: { url: frame },
        });
      }
    }

    const result = await callOpenRouter(apiKey, {
      messages: [
        {
          role: "system",
          content:
            "You are a visual designer. Always respond with valid JSON only, no markdown fences.",
        },
        {
          role: "user",
          content: frames?.length
            ? (userContent as unknown as string) // OpenRouter accepts multimodal content
            : prompt,
        },
      ],
      temperature: 0.9,
      maxTokens: 1500,
    });

    // Parse the JSON from the response
    const jsonMatch =
      result.match(/```json\s*([\s\S]*?)```/) || result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response("Failed to parse thumbnail designs", { status: 500 });
    }

    const json = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(json);

    return NextResponse.json(parsed);
  } catch (err) {
    return new Response((err as Error).message, { status: 500 });
  }
}
