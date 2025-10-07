
'use server';

/**
 * @fileOverview An AI flow for correcting or modifying embed JSON.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const EmbedJsonFixerInputSchema = z.object({
  json: z.string().describe("The user's potentially incorrect embed JSON string."),
  request: z.string().describe("The user's request, e.g., 'fix this JSON' or 'add a new field named Test'."),
});

const EmbedJsonFixerOutputSchema = z.object({
  fixedJson: z.string().describe("The corrected and valid JSON string for the Discord embed."),
});

export type EmbedJsonFixerInput = z.infer<typeof EmbedJsonFixerInputSchema>;
export type EmbedJsonFixerOutput = z.infer<typeof EmbedJsonFixerOutputSchema>;


const jsonFixerPrompt = ai.definePrompt({
    name: 'embedJsonFixerPrompt',
    input: { schema: EmbedJsonFixerInputSchema },
    output: { schema: EmbedJsonFixerOutputSchema },
    model: 'googleai/gemini-2.0-flash',
    prompt: `You are an expert in Discord embed JSON. Your task is to take a user's JSON string and a modification request, and return a valid, corrected, and well-formatted JSON string.

User's JSON:
\`\`\`json
{{{json}}}
\`\`\`

User's Request: "{{{request}}}"

1.  Analyze the user's JSON. If it's invalid, identify the errors.
2.  Understand the user's request.
3.  Generate a new, valid JSON string that incorporates the requested changes and fixes any syntax errors.
4.  Ensure the final JSON is perfectly formatted and ready to be sent to the Discord API.
5.  If the user just asks to "fix" the JSON, simply correct any errors without adding new content.

Return only the corrected JSON string in the 'fixedJson' field.
`,
});


export const fixEmbedJson = ai.defineFlow(
  {
    name: 'fixEmbedJson',
    inputSchema: EmbedJsonFixerInputSchema,
    outputSchema: EmbedJsonFixerOutputSchema,
  },
  async (input) => {
    const { output } = await jsonFixerPrompt(input);
    return output!;
  }
);
