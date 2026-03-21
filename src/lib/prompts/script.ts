export function buildScriptPrompt(
  topic: string,
  pov: string,
  research: string,
  toneModifier: string
): string {
  return `You are an expert Instagram Reels scriptwriter. Write a compelling script for a 30-60 second Instagram Reel.

Topic: ${topic}
${pov ? `Creator's POV/Angle: ${pov}` : ""}

TONE INSTRUCTIONS: ${toneModifier}

Research context:
${research}

Write the script in the following JSON format:
\`\`\`json
{
  "hook": "The opening line (first 3 seconds) that stops the scroll. Make it punchy and attention-grabbing.",
  "body": "The main content of the script. Use short, punchy sentences. Include natural pauses. Write it as spoken word, not written text.",
  "cta": "The call to action at the end. Tell viewers what to do next.",
  "segments": [
    {
      "shotId": "shot-1",
      "text": "The exact words for this shot — must be a complete thought, NEVER cut mid-sentence.",
      "emphasisWords": ["word1", "word2"],
      "wordCount": 12,
      "estimatedSeconds": 4.8
    }
  ]
}
\`\`\`

SEGMENT RULES:
- Split the FULL script (hook + body + cta) into 4-8 segments, one per shot
- Segment 1 = the hook. Last segment = the CTA. Middle segments = body split by complete thoughts.
- Each segment MUST be a complete thought — NEVER split mid-sentence
- "emphasisWords" = 1-3 key words the creator should stress when speaking
- "wordCount" = actual word count of the segment text
- "estimatedSeconds" = wordCount / 2.5 (speaking at 150 words per minute)
- "shotId" = "shot-1", "shot-2", etc. in order
- Total word count across all segments: 75-150 words (30-60 seconds)
- body field = all segment texts joined (for backward compatibility)

Guidelines:
- Hook must be irresistible — the viewer decides to stay or leave in 1.5 seconds
- Body should be conversational, not robotic
- Use power words and emotional triggers
- Include natural transition phrases
- Keep sentences short (max 15 words each)
- CTA should feel natural, not salesy

Return ONLY the JSON, no other text.`;
}
