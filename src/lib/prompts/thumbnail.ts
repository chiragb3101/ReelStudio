export function buildThumbnailPrompt(
  topic: string,
  hook: string,
  tone: string
): string {
  return `Create an eye-catching Instagram Reel thumbnail/cover image for the following content:

Topic: ${topic}
Hook: ${hook}
Tone: ${tone}

Create a visually striking 9:16 vertical image that would make someone tap on this Reel.
The image should:
- Be bold and attention-grabbing
- Use contrasting colors
- Feel modern and Gen-Z aesthetic
- Include bold text overlay with a short teaser (max 5 words)
- Have clean composition optimized for mobile viewing
- Match the ${tone} tone of the content

Make it vibrant and scroll-stopping.`;
}
