
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


export const fixEmbedJson = ai.defineFlow(
  {
    name: 'fixEmbedJson',
    inputSchema: EmbedJsonFixerInputSchema,
    outputSchema: EmbedJsonFixerOutputSchema,
  },
  async (input) => {
    // Manually construct the prompt as a simple string
    const promptText = `
You are an expert in Discord embed JSON. Your task is to take a user's JSON string and a modification request, and return a valid, corrected, and well-formatted JSON string.

1.  Analyze the user's JSON. If it's invalid, identify the errors.
2.  Understand the user's request.
3.  Generate a new, valid JSON string that incorporates the requested changes and fixes any syntax errors.
4.  Ensure the final JSON is perfectly formatted and ready to be sent to the Discord API.
5.  If the user just asks to "fix" the JSON, simply correct any errors without adding new content.

Return ONLY the corrected JSON string in your response.

User's JSON:
\`\`\`json
${input.json}
\`\`\`

User's Request: "${input.request}"
`;

    // Use ai.generate for a simpler, direct call to the model
    const { text } = await ai.generate({
      prompt: promptText,
      model: 'googleai/gemini-2.0-flash',
    });
    
    // Extract the JSON from the raw text response
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return { fixedJson: cleanedText };
  }
);
