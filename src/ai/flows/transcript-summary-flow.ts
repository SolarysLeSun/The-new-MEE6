
'use server';

/**
 * @fileOverview An AI flow for summarizing conversation transcripts.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SummaryInputSchema = z.object({
  transcript: z.string().describe("A transcript of a conversation, with each line prefixed by the user's name."),
});

const SummaryOutputSchema = z.object({
  summary: z.string().describe("A concise summary of the conversation, highlighting key points, decisions, and outcomes."),
});

export type SummaryInput = z.infer<typeof SummaryInputSchema>;
export type SummaryOutput = z.infer<typeof SummaryOutputSchema>;

const summaryPrompt = ai.definePrompt({
    name: 'transcriptSummaryPrompt',
    input: { schema: SummaryInputSchema },
    output: { schema: SummaryOutputSchema },
    model: 'googleai/gemini-2.0-flash',
    prompt: `You are an expert meeting secretary. Your task is to read a conversation transcript and write a concise summary.

The summary should focus on:
- The main topics discussed.
- Any decisions that were made.
- Action items or next steps.
- The final outcome or resolution of the conversation.

Do not include small talk or irrelevant details. The output should be a clear and easy-to-read summary.

Conversation Transcript:
"""
{{{transcript}}}
"""

Generate the summary now.
`,
});

export const transcriptSummaryFlow = ai.defineFlow(
  {
    name: 'transcriptSummaryFlow',
    inputSchema: SummaryInputSchema,
    outputSchema: SummaryOutputSchema,
  },
  async (input) => {
    const { output } = await summaryPrompt(input);
    return output!;
  }
);
