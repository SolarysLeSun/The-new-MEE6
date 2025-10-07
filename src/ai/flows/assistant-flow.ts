'use server';

/**
 * @fileOverview A general-purpose AI assistant flow.
 */

import { ai, textModelCascade } from '@/ai/genkit';
import { z } from 'genkit';

const AssistantInputSchema = z.object({
  prompt: z.string().describe("The user's query or question."),
  userName: z.string().describe("The name of the user asking the question."),
});

const AssistantOutputSchema = z.object({
  response: z.string().describe("The AI's helpful and concise response."),
});

export type AssistantInput = z.infer<typeof AssistantInputSchema>;
export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;

const assistantPrompt = ai.definePrompt({
  name: 'assistantPrompt',
  input: { schema: AssistantInputSchema },
  output: { schema: AssistantOutputSchema },
  prompt: `You are a versatile and helpful AI assistant integrated into a Discord bot named Marcus.
A user named {{{userName}}} has asked for your help.
Your task is to provide a clear, concise, and accurate answer to their prompt.

You can handle a wide range of requests, including:
- Definitions
- Calculations
- Code correction or explanation
- General knowledge questions
- Text summarization or reformulation

The user's prompt is:
"{{{prompt}}}"

Provide your direct response now.`,
});

export const assistantFlow = ai.defineFlow(
  {
    name: 'assistantFlow',
    inputSchema: AssistantInputSchema,
    outputSchema: AssistantOutputSchema,
  },
  async (input) => {
    let lastError: any;
    for (const model of textModelCascade) {
      try {
        const { output } = await assistantPrompt(input, { model });
        return output!;
      } catch (error: any) {
        lastError = error;
        if (error.status === 429 || error.message.includes('quota')) {
          continue;
        }
        break;
      }
    }
    throw lastError;
  }
);
