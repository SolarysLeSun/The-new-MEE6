
'use server';

/**
 * @fileOverview An AI flow for generating Truth or Dare questions.
 */

import { ai, textModelCascade } from '@/ai/genkit';
import { z } from 'genkit';

const TruthOrDareInputSchema = z.object({
  type: z.enum(['truth', 'dare']).describe("The type of challenge to generate."),
  theme: z.string().describe("The theme for the challenge (e.g., 'classic', 'spicy', 'weird', 'adult')."),
});

const TruthOrDareOutputSchema = z.object({
  content: z.string().describe("The generated truth question or dare action."),
});

export type TruthOrDareInput = z.infer<typeof TruthOrDareInputSchema>;
export type TruthOrDareOutput = z.infer<typeof TruthOrDareOutputSchema>;

const truthOrDarePrompt = ai.definePrompt({
  name: 'truthOrDarePrompt',
  input: { schema: TruthOrDareInputSchema },
  output: { schema: TruthOrDareOutputSchema },
  prompt: `You are a creative and witty game master for a game of Truth or Dare.
Your task is to generate a single, engaging, and context-appropriate challenge.

The challenge type is: {{{type}}}
The theme is: {{{theme}}}

Your instructions:
- Generate a question if the type is 'truth'.
- Generate an action if the type is 'dare'.
- Tailor the challenge to the specified theme.
- 'classic': Fun, safe-for-work questions and actions.
- 'spicy': Questions about relationships, crushes, and mild romantic scenarios. Dares can be flirty but not explicit.
- 'weird': Bizarre, funny, and unexpected questions or actions.
- 'adult': This is the +18 category. Questions and dares can be sexually suggestive, explicit, and push boundaries. Do not hold back on this theme.

Generate ONE challenge now.
`,
});

export const truthOrDareFlow = ai.defineFlow(
  {
    name: 'truthOrDareFlow',
    inputSchema: TruthOrDareInputSchema,
    outputSchema: TruthOrDareOutputSchema,
  },
  async (input) => {
    let lastError: any;
    // For +18 content, we might need to be more permissive with safety filters.
    const safetySettings = input.theme === 'adult'
        ? [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          ]
        : [];

    for (const model of textModelCascade) {
      try {
        const { output } = await truthOrDarePrompt(input, { model, config: { safetySettings } });
        if (!output?.content) throw new Error("Generated content is empty.");
        return output;
      } catch (error: any) {
        lastError = error;
        if (error.status === 429 || error.message.includes('quota')) {
          continue;
        }
        // If it's a safety block, don't retry, just fail.
        if (error.message.includes('SAFETY')) {
            break;
        }
      }
    }
    throw lastError || new Error("Failed to generate content after trying all models.");
  }
);
