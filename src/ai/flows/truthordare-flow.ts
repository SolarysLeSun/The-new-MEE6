
'use server';

/**
 * @fileOverview An AI flow for generating truth or dare questions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TruthOrDareInputSchema = z.object({
  type: z.enum(['truth', 'dare']).describe("The type of question to generate."),
  category: z.enum(['soft', 'fun', 'spicy']).describe("The category or intensity of the question."),
});

const TruthOrDareOutputSchema = z.object({
  question: z.string().describe("The generated truth question or dare challenge."),
});

export type TruthOrDareInput = z.infer<typeof TruthOrDareInputSchema>;
export type TruthOrDareOutput = z.infer<typeof TruthOrDareOutputSchema>;

const truthOrDarePrompt = ai.definePrompt({
    name: 'truthOrDarePrompt',
    input: { schema: TruthOrDareInputSchema },
    output: { schema: TruthOrDareOutputSchema },
    prompt: `You are a game master for a Discord server. Your task is to generate a 'Truth or Dare' question.
The question should be in French.

The user wants a question of type: {{{type}}}
The desired category is: {{{category}}}

- 'soft': Questions légères, adaptées à tout public.
- 'fun': Questions amusantes ou défis créatifs.
- 'spicy': Questions plus personnelles ou défis osés (sans être inappropriés pour Discord).

Generate one question now.
`,
});

export const truthOrDareFlow = ai.defineFlow(
  {
    name: 'truthOrDareFlow',
    inputSchema: TruthOrDareInputSchema,
    outputSchema: TruthOrDareOutputSchema,
  },
  async (input) => {
    const { output } = await truthOrDarePrompt(input);
    return output!;
  }
);
