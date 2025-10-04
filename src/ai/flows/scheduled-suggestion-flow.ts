
'use server';

/**
 * @fileOverview An AI flow for generating scheduled content suggestions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ScheduledSuggestionInputSchema = z.object({
  tags: z.string().describe('A comma-separated list of tags or themes for the suggestion (e.g., "sci-fi movie", "indie game").'),
  customPrompt: z.string().optional().describe('A custom prompt to guide the style and tone of the AI.'),
});

const ScheduledSuggestionOutputSchema = z.object({
  title: z.string().describe('A catchy title for the suggestion embed.'),
  message: z.string().describe('The formatted suggestion message, ready to be posted in a Discord channel. Should use Markdown.'),
});

export type ScheduledSuggestionInput = z.infer<typeof ScheduledSuggestionInputSchema>;
export type ScheduledSuggestionOutput = z.infer<typeof ScheduledSuggestionOutputSchema>;

const suggestionPrompt = ai.definePrompt({
    name: 'scheduledSuggestionPrompt',
    input: { schema: ScheduledSuggestionInputSchema },
    output: { schema: ScheduledSuggestionOutputSchema },
    model: 'googleai/gemini-2.0-flash',
    prompt: `You are a Community Animator AI for a Discord server. Your task is to generate an engaging content suggestion based on a set of tags.

Your suggestion should be something that sparks conversation.

Tags/Themes: {{{tags}}}
{{#if customPrompt}}
Your personality/instructions: {{{customPrompt}}}
{{else}}
Your personality/instructions: Be enthusiastic and friendly.
{{/if}}

Based on the tags, suggest a specific movie, video game, book, or any other piece of content.
1.  Create a short, catchy title for the suggestion. Include a relevant emoji.
2.  Write a message that presents the suggestion. Explain briefly why you recommend it and ask an open-ended question to encourage discussion. Use Discord markdown to make it look good.

Example:
Tags: "sci-fi movie"
Output:
{
  "title": "🎬 Suggestion Film de la Semaine",
  "message": "Salut tout le monde ! ✨\n\nCette semaine, je vous propose de (re)découvrir **Blade Runner 2049** ! La photographie est à couper le souffle et l'ambiance est juste incroyable.\n\nL'avez-vous déjà vu ? Pensez-vous qu'il surpasse l'original ?"
}

Generate a new suggestion now.
`,
});

export const scheduledSuggestionFlow = ai.defineFlow(
  {
    name: 'scheduledSuggestionFlow',
    inputSchema: ScheduledSuggestionInputSchema,
    outputSchema: ScheduledSuggestionOutputSchema,
  },
  async (input) => {
    const { output } = await suggestionPrompt(input);
    return output!;
  }
);
