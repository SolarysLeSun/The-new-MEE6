
'use server';

/**
 * @fileOverview An AI flow to guide users to the correct module in the web panel.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ModuleInfoSchema = z.object({
  href: z.string(),
  label: z.string(),
  keywords: z.array(z.string()),
});

const FaqNavigationInputSchema = z.object({
  userQuestion: z.string().describe("The user's question about a feature or where to configure something."),
  modules: z.array(ModuleInfoSchema).describe("The list of all available modules with their labels, paths, and associated keywords."),
});

const FaqNavigationOutputSchema = z.object({
  found: z.boolean().describe("Whether a relevant module was found."),
  moduleName: z.string().describe("The name of the most relevant module found."),
  moduleHref: z.string().describe("The URL path for the relevant module."),
  explanation: z.string().describe("A concise, helpful explanation for the user, guiding them to the module."),
});

export type FaqNavigationInput = z.infer<typeof FaqNavigationInputSchema>;
export type FaqNavigationOutput = z.infer<typeof FaqNavigationOutputSchema>;

const navigationPrompt = ai.definePrompt({
    name: 'faqNavigationPrompt',
    input: { schema: FaqNavigationInputSchema },
    output: { schema: FaqNavigationOutputSchema },
    model: 'googleai/gemini-2.0-flash',
    prompt: `You are a helpful AI assistant for the "Marcus" Discord bot. Your job is to help users find the correct configuration page in the web panel.

You will be given a user's question and a list of all available modules with their names, paths (href), and keywords.

Your task:
1. Analyze the user's question to understand what feature they are looking for.
2. Search through the list of modules, using their labels and keywords to find the best match.
3. If you find a good match:
    - Set 'found' to true.
    - Set 'moduleName' to the label of the found module.
    - Set 'moduleHref' to the href of the found module.
    - Write a short, friendly 'explanation' telling the user that the feature they are looking for is in that module.
4. If you cannot find a relevant module, set 'found' to false and explain that you couldn't find a matching feature.

---
User's Question: "{{{userQuestion}}}"
---
Available Modules:
{{#each modules}}
- Module: "{{this.label}}", Path: "{{this.href}}", Keywords: [{{#each this.keywords}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}]
{{/each}}
---

Analyze the user's question and provide your response now.
`,
});

export const faqNavigationFlow = ai.defineFlow(
  {
    name: 'faqNavigationFlow',
    inputSchema: FaqNavigationInputSchema,
    outputSchema: FaqNavigationOutputSchema,
  },
  async (input) => {
    const { output } = await navigationPrompt(input);
    return output!;
  }
);
