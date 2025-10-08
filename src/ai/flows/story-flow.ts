
'use server';

/**
 * @fileOverview An AI flow for generating short stories.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { textModelCascade } from '../genkit';

const StoryInputSchema = z.object({
  topic: z.string().describe("The main topic or synopsis of the story."),
  tags: z.string().optional().describe("Comma-separated tags to define the mood or genre (e.g., 'sombre', 'humoristique', 'épique')."),
  users: z.array(z.string()).optional().describe("A list of user names to include as characters in the story."),
  authorName: z.string().describe("The name of the user who requested the story."),
});

const StoryOutputSchema = z.object({
  title: z.string().describe("A creative and fitting title for the generated story."),
  story: z.string().describe("The full text of the short story, formatted with Discord markdown."),
});

export type StoryInput = z.infer<typeof StoryInputSchema>;
export type StoryOutput = z.infer<typeof StoryOutputSchema>;

// The prompt input schema is now different from the flow's input schema
const StoryPromptInputSchema = StoryInputSchema.extend({
    usersString: z.string().optional().describe("A comma-separated string of user names."),
});

const storyPrompt = ai.definePrompt({
  name: 'storyPrompt',
  input: { schema: StoryPromptInputSchema }, // Use the modified schema
  output: { schema: StoryOutputSchema },
  prompt: `You are a talented storyteller and creative writer. Your task is to write a short, engaging story based on the user's request.

The story should be captivating and well-structured, even if it's short.
Incorporate the provided elements naturally into the narrative.

Story Request from {{{authorName}}}:
- Topic/Synopsis: {{{topic}}}
{{#if tags}}
- Mood/Tags: {{{tags}}}
{{/if}}
{{#if usersString}}
- Characters to include: {{{usersString}}}
{{/if}}

Please write a creative title and the story now. Use Discord markdown (like *italics* for emphasis or thoughts, and **bold** for important actions) to enhance the reading experience.
`,
});

export const storyFlow = ai.defineFlow(
  {
    name: 'storyFlow',
    inputSchema: StoryInputSchema,
    outputSchema: StoryOutputSchema,
  },
  async (input) => {
    let lastError: any;
    
    // Prepare data for the prompt: convert array to string
    const usersString = input.users && input.users.length > 0 ? input.users.join(', ') : undefined;
    const promptInput = { ...input, usersString };

    for (const model of textModelCascade) {
      try {
        const { output } = await storyPrompt(promptInput, { model });
        return output!;
      } catch (error: any) {
        lastError = error;
        if (error.status === 429 || error.status === 503 || error.message.includes('quota')) {
          continue;
        }
        break;
      }
    }
    throw lastError;
  }
);
