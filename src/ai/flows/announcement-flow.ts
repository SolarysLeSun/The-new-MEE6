
'use server';

/**
 * @fileOverview An AI flow for reformatting user announcements into clean embeds.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnnouncementInputSchema = z.object({
  rawText: z.string().describe("The user's raw, unformatted announcement text, or the base text to modify."),
  authorName: z.string().describe("The name of the person making the announcement."),
  targetLanguage: z.string().optional().describe("The specific language to translate the announcement into. If not provided, the original language will be kept."),
  modificationRequest: z.string().optional().describe("A user's request to modify the previously generated text. 'rawText' will contain the original text to be modified."),
});

const AnnouncementOutputSchema = z.object({
  title: z.string().describe("A short, catchy, and relevant title for the announcement, in the target language."),
  description: z.string().describe("The well-formatted and rewritten announcement text, in the target language, ready for a Discord embed. Use Discord markdown like **bold** and *italics*."),
});

export async function announcementFlow(input: z.infer<typeof AnnouncementInputSchema>): Promise<z.infer<typeof AnnouncementOutputSchema>> {
  const { output } = await announcementPrompt(input);
  return output!;
}


const announcementPrompt = ai.definePrompt({
    name: 'announcementPrompt',
    input: { schema: AnnouncementInputSchema },
    output: { schema: AnnouncementOutputSchema },
    model: 'googleai/gemini-2.0-flash',
    prompt: `You are an expert community manager and copywriter for a Discord server. Your task is to take a raw announcement text from an administrator and transform it into a clean, professional, and engaging announcement embed.

--- Graphic Charter ---
You MUST use these custom emojis where appropriate. Always use the full format <:name:id>.
- Title Prefix: <:fleche:1421563500190371932>
- List Item: <:point_h:1421563605630845009>
- Important Warning: <:warn:1421563647909560462>
- Yes/Confirm: <:Oui:1421563353888723084>
- No/Cancel: <:Non:1421563259537850471>
--- End of Charter ---

You must:
{{#if modificationRequest}}
1. Take the original text provided in 'rawText' and modify it based on the 'modificationRequest'. The final output must be a new, complete version of the announcement incorporating the changes.
{{else}}
1. Read the raw text to understand the core message.
{{/if}}
{{#if targetLanguage}}
2. Translate the entire content into {{{targetLanguage}}}. The final title and description must be in this language.
{{else}}
2. Detect the original language of the text and keep the announcement in that language.
{{/if}}
3. Create a short, impactful title that summarizes the announcement, prefixed with the correct emoji from the charter.
4. Rewrite the body of the announcement. Clean up any typos, improve the phrasing, and structure it for readability using Discord markdown (e.g., **bold** for important points, *italics* for emphasis) and the list item emoji from the charter.
5. Ensure the tone is professional yet engaging for a community.

The announcement was written by: {{{authorName}}}
{{#if modificationRequest}}
Base text to modify:
"""
{{{rawText}}}
"""
Modification requested: "{{{modificationRequest}}}"
{{else}}
Raw announcement text:
"""
{{{rawText}}}
"""
{{/if}}

Generate the title and description for the Discord embed now, following all instructions and the graphic charter.
`,
});

