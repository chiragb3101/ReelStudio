export function buildResearchPrompt(topic: string, pov: string): string {
  return `You are an expert Instagram Reels content researcher. Research the following topic for a short-form video (30-90 seconds).

Topic: ${topic}
${pov ? `Creator's POV/Angle: ${pov}` : ""}

Provide comprehensive research in Markdown format covering:

## Key Facts & Statistics
- 3-5 compelling data points or facts about this topic
- Include sources where possible

## Trending Angles
- What angles are currently trending on Instagram for this topic?
- What hooks are working well?

## Target Audience Insights
- Who engages most with this type of content?
- What pain points or desires does this topic address?

## Competitor Analysis
- What are top creators doing with similar topics?
- What gaps can we fill?

## Content Opportunities
- Unique angles to explore
- Contrarian takes that could drive engagement

Keep the research actionable and focused on what will help create a viral Instagram Reel.`;
}
