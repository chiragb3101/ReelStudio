export function buildCaptionPrompt(
  topic: string,
  script: { hook: string; body: string; cta: string },
  toneModifier: string
): string {
  return `You are an Instagram growth expert who writes captions that drive engagement.

Topic: ${topic}
Script Hook: ${script.hook}
Script CTA: ${script.cta}

TONE INSTRUCTIONS: ${toneModifier}

Write an Instagram caption for this Reel. Return in JSON format:
\`\`\`json
{
  "caption": "The full caption text. Use line breaks for readability. Include a hook in the first line (before the 'more' fold). End with engagement prompt.",
  "hashtags": ["relevant", "hashtags", "without", "the", "hash", "symbol"]
}
\`\`\`

Guidelines:
- First line must hook — it shows before "...more"
- Use line breaks and spacing for readability
- Include a micro-CTA (save, share, comment)
- 15-25 relevant hashtags mixing popular and niche
- Mix of branded, topical, and community hashtags
- Caption length: 150-300 words
- Use emojis sparingly but strategically

Return ONLY the JSON, no other text.`;
}
