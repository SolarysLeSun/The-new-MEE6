
'use server';

/**
 * @fileOverview An AI agent that assigns Discord roles based on user answers to a questionnaire.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { AiRoleMapping } from '@/types';

const RoleMappingSchema = z.object({
  id: z.string(),
  role_id: z.string(),
  keywords: z.array(z.string()),
});

const RoleAssignmentInputSchema = z.object({
  userAnswers: z.array(z.string()).describe("An array of the user's answers to the onboarding questions."),
  roleMappings: z.array(RoleMappingSchema).describe("An array of objects mapping keywords to specific role IDs."),
});

const RoleAssignmentOutputSchema = z.object({
  rolesToAssign: z.array(z.string()).describe("An array of role IDs to be assigned to the user based on their answers."),
});

export type RoleAssignmentInput = z.infer<typeof RoleAssignmentInputSchema>;
export type RoleAssignmentOutput = z.infer<typeof RoleAssignmentOutputSchema>;

const roleAssignmentPrompt = ai.definePrompt({
  name: 'roleAssignmentPrompt',
  input: { schema: RoleAssignmentInputSchema },
  output: { schema: RoleAssignmentOutputSchema },
  model: 'googleai/gemini-2.0-flash',
  prompt: `You are an intelligent role assignment bot for Discord. Your task is to analyze a user's answers to a series of questions and determine which roles they should receive based on a set of keyword mappings.

Rules:
1.  Read all of the user's answers to get a complete picture.
2.  For each role mapping, check if any of its associated keywords appear in *any* of the user's answers.
3.  The keyword match should be case-insensitive.
4.  If a keyword is found, add the corresponding 'role_id' to the 'rolesToAssign' list.
5.  Do not assign the same role more than once.

User's Answers:
{{#each userAnswers}}
- "{{this}}"
{{/each}}

Role Mappings:
{{#each roleMappings}}
- Role ID: {{this.role_id}} -> Keywords: [{{#each this.keywords}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}]
{{/each}}

Analyze the answers and return the list of role IDs to assign.`,
});

export const roleAssignmentFlow = ai.defineFlow(
  {
    name: 'roleAssignmentFlow',
    inputSchema: RoleAssignmentInputSchema,
    outputSchema: RoleAssignmentOutputSchema,
  },
  async (input) => {
    if (!input.userAnswers || input.userAnswers.length === 0 || !input.roleMappings || input.roleMappings.length === 0) {
        return { rolesToAssign: [] };
    }

    const { output } = await roleAssignmentPrompt(input);
    
    // Ensure uniqueness of roles
    if (output?.rolesToAssign) {
        output.rolesToAssign = [...new Set(output.rolesToAssign)];
    }

    return output!;
  }
);
