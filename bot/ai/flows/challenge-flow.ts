
'use server';

/**
 * @fileOverview An AI flow for generating daily challenges for a Discord server.
 */

import { ai, textModelCascade } from '@/ai/genkit';
import { z } from 'genkit';

const ChallengeSchema = z.object({
  type: z.enum(['MESSAGES_SENT', 'VOICE_MINUTES', 'REACTIONS_ADDED', 'INVITE_USER'])
    .describe("The type of action to track."),
  description: z.string().describe("A short, engaging description of the challenge for the user. Example: 'Le Barde : Envoyez 50 messages aujourd\\'hui.'"),
  goal: z.number().int().min(1).describe("The numerical goal for the challenge. Example: 50"),
  xp_reward: z.number().int().min(1).describe("The amount of XP to award upon completion."),
});

const ChallengeGenerationInputSchema = z.object({
  existingChallenges: z.array(z.string()).describe("A list of challenge descriptions from the past 3 days to ensure variety."),
  serverType: z.string().describe("The type of server community (e.g., 'gaming', 'social', 'educational')."),
});

const ChallengeGenerationOutputSchema = z.object({
  challenges: z.array(ChallengeSchema).length(5).describe("An array of exactly 5 unique challenges."),
});

export type Challenge = z.infer<typeof ChallengeSchema>;
export type ChallengeGenerationOutput = z.infer<typeof ChallengeGenerationOutputSchema>;

const challengePrompt = ai.definePrompt({
  name: 'challengeGenerationPrompt',
  input: { schema: ChallengeGenerationInputSchema },
  output: { schema: ChallengeGenerationOutputSchema },
  prompt: `You are a Game Master AI for a Discord bot. Your task is to generate a list of exactly 5 diverse and engaging daily challenges for a Discord community.

The server type is: {{{serverType}}}.
To ensure variety, do not repeat challenges that are too similar to these recent ones:
{{#each existingChallenges}}
- "{{this}}"
{{/each}}

Challenge Ideas:
- MESSAGES_SENT: Encourage talking. Goals can range from 20 to 200. Give them fun names like "Le Barde", "Moulin à paroles".
- VOICE_MINUTES: Encourage voice activity. Goals can be from 30 to 120 minutes. Name them "Chanteur d'opéra", "La Pipelette".
- REACTIONS_ADDED: Encourage engagement. Goals from 10 to 100 reactions.
- INVITE_USER: Encourage growth. Goal is always 1. High XP reward.

Rules:
1.  Generate exactly 5 challenges.
2.  The challenges must be diverse in type (use different types from the enum).
3.  The goals and XP rewards should be reasonably balanced. High-effort tasks should give more XP.
4.  Descriptions MUST be creative, short, and in French.

Generate the 5 daily challenges now.
`,
});

export const challengeGenerationFlow = ai.defineFlow(
  {
    name: 'challengeGenerationFlow',
    inputSchema: ChallengeGenerationInputSchema,
    outputSchema: ChallengeGenerationOutputSchema,
  },
  async (input) => {
    for (const model of textModelCascade) {
      try {
        const { output } = await challengePrompt(input, { model });
        if (output && output.challenges.length === 5) {
          return output;
        }
      } catch (error) {
        console.error(`[Challenge Flow] Model ${model} failed.`, error);
      }
    }
    // Fallback in case of total failure
    return {
        challenges: [
            { type: 'MESSAGES_SENT', description: 'Le Billet Doux : Envoyez 10 messages.', goal: 10, xp_reward: 50 },
            { type: 'MESSAGES_SENT', description: 'La Plume Agile : Envoyez 50 messages.', goal: 50, xp_reward: 250 },
            { type: 'VOICE_MINUTES', description: 'Le Bavard : Passez 30 minutes en vocal.', goal: 30, xp_reward: 300 },
            { type: 'REACTIONS_ADDED', description: 'L\'Expressif : Ajoutez 20 réactions.', goal: 20, xp_reward: 100 },
            { type: 'INVITE_USER', description: 'L\'Ambassadeur : Invitez un ami sur le serveur.', goal: 1, xp_reward: 1000 },
        ]
    };
  }
);
