
'use server';

/**
 * @fileOverview An AI flow for correcting and enhancing patch notes.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PatchNoteInputSchema = z.object({
  rawText: z.string().describe("The user's raw, unformatted patch note text."),
  authorName: z.string().describe("The name of the person writing the patch note."),
  isOfficial: z.boolean().describe("If true, the author should be 'L'équipe officielle de Marcus'."),
  mode: z.enum(['simple', 'upgrade']).describe("The correction mode: 'simple' for basic grammar, 'upgrade' for full reformulation."),
});

const PatchNoteOutputSchema = z.object({
  title: z.string().describe("A suitable title for the patch note, like 'Notes de mise à jour'."),
  author: z.string().describe("The final author name to be displayed."),
  content: z.string().describe("The corrected and formatted patch note content, using Discord markdown."),
});

export type PatchNoteInput = z.infer<typeof PatchNoteInputSchema>;
export type PatchNoteOutput = z.infer<typeof PatchNoteOutputSchema>;


const patchNotePrompt = ai.definePrompt({
    name: 'patchNotePrompt',
    input: { schema: PatchNoteInputSchema },
    output: { schema: PatchNoteOutputSchema },
    model: 'googleai/gemini-2.0-flash',
    prompt: `You are an expert technical writer and editor for a software project. Your task is to take a raw patch note and refine it for public release on Discord.

--- Graphic Charter ---
You MUST use these custom emojis when their shortcode is present or implied. Always use the full format <:name:id>.
- :fleche: -> <:fleche:1421563500190371932> (Use for titles)
- :point_h: -> <:point_h:1421563605630845009> (Use for list items)
- :warn: -> <:warn:1421563647909560462> (Use for important warnings)
- :Oui: -> <:Oui:1421563353888723084> (Use for added features)
- :Non: -> <:Non:1421563259537850471> (Use for removed features)
- :Option: -> <:Option:1421563335094042796> (Use for modifications/updates)
--- End of Charter ---

The user has provided the following details:
- Raw Text: "{{{rawText}}}"
- Original Author: {{{authorName}}}
- Is Official Announcement: {{{isOfficial}}}
- Correction Mode: {{{mode}}}

Your instructions are:
1.  Determine the author. If 'isOfficial' is true, the author is "L'équipe officielle de Marcus". Otherwise, it is the original author's name.
2.  Create a standard title, prefixed with the arrow emoji: "<:fleche:1421563500190371932> Notes de mise à jour".
3.  Process the 'rawText' based on the 'correctionMode':
    -   If mode is 'simple': Perform only basic spelling and grammar correction. The sentence structure and original wording must be preserved as much as possible.
    -   If mode is 'upgrade': You have full creative freedom. Rewrite and reformulate the text for maximum clarity, impact, and professionalism. You can change sentence structure, add bullet points (using the list item emoji), and use Discord markdown (like **bold**, *italics*, \`code\`, and > quotes) to improve readability. Use the other emojis from the charter to highlight additions, removals, or changes.
4.  Return the final title, author, and processed content.

Begin processing now.
`,
});


export const patchNoteFlow = ai.defineFlow(
  {
    name: 'patchNoteFlow',
    inputSchema: PatchNoteInputSchema,
    outputSchema: PatchNoteOutputSchema,
  },
  async (input) => {
    const { output } = await patchNotePrompt(input);
    return output!;
  }
);

