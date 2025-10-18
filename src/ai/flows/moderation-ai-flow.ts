'use server';

/**
 * @fileOverview An AI agent that analyzes messages for toxic content and suggests moderation actions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { SanctionHistoryEntry } from '@/types';

const SanctionHistoryEntrySchema = z.object({
  action_type: z.string(),
  reason: z.string().optional(),
  timestamp: z.string(),
});

const ModerationAiInputSchema = z.object({
  messageContent: z.string().describe('The message content to analyze.'),
  userName: z.string().describe("The name of the user who sent the message."),
  conversationContext: z.array(z.string()).optional().describe("The last 5 messages in the channel for context."),
  userSanctionHistory: z.array(SanctionHistoryEntrySchema).optional().describe("The user's past sanctions on this server."),
  sensitivity: z.enum(['low', 'medium', 'high']).describe('The sensitivity level for detection.'),
});

const ModerationAiOutputSchema = z.object({
  isToxic: z.boolean().describe('Whether the message is considered toxic or not.'),
  reason: z.string().describe('A brief, user-friendly reason for the moderation decision (e.g., "Insultant", "Discours haineux"). Empty if not toxic.'),
  severity: z.enum(['none', 'low', 'medium', 'high', 'critical']).describe('The severity of the toxicity. Default to "none" if not applicable.'),
  suggestedAction: z.enum(['none', 'warn', 'delete', 'mute', 'kick', 'ban']).describe("The suggested moderation action."),
  suggestedDuration: z.string().optional().describe("The suggested duration for a mute action (e.g., '5m', '1h', '24h'). Empty if not applicable.")
});

export type ModerationAiInput = z.infer<typeof ModerationAiInputSchema>;
export type ModerationAiOutput = z.infer<typeof ModerationAiOutputSchema>;

export async function moderationAiFlow(input: ModerationAiInput): Promise<ModerationAiOutput> {
    // Prevent analyzing very short, non-toxic messages
    if (input.messageContent.length < 3 && !/[*@_~`|]/.test(input.messageContent)) {
        return { isToxic: false, reason: '', severity: 'none', suggestedAction: 'none', suggestedDuration: undefined };
    }
  return flow(input);
}

const filterPrompt = ai.definePrompt({
  name: 'moderationAiPrompt',
  input: { schema: ModerationAiInputSchema },
  output: { schema: ModerationAiOutputSchema },
  model: 'googleai/gemini-2.0-flash',
  prompt: `You are a measured, fair, and context-aware content moderator for a Discord server. Your entire response and analysis must be in **FRENCH**.
Your task is to determine if a user's message is toxic and suggest an appropriate moderation action.

---

### Core Principles

1.  **Common Sense First:** Prioritize the *actual meaning and tone*. If a message is neutral (e.g., "bonjour ?", "ça va ?"), it is **not toxic**. Do not flag it.
2.  **Context Awareness:** Use conversation history to understand humor and sarcasm. User history is an *aggravating factor* only if the message is **already borderline toxic**.
3.  **When in doubt, classify as 'none'.** It's better to under-react than to over-react.

---

### Analysis Process & Severity Guide

1.  Read the message from user '{{{userName}}}': "{{{messageContent}}}"
2.  Analyze the context and user's sanction history.
3.  Classify the message's severity and suggest an action:
    - **none:** Harmless, ambiguous, or very mild language not directed at anyone. If there is any doubt, choose 'none'. **No action will be taken.** This is a safe default.
    - **low:** A clear but minor insult or provocation. (e.g., "t'es nul", "ferme la"). Suggest 'warn'.
    - **medium:** Targeted harassment or stronger offensive language. Suggest 'mute' and propose a short duration like '10m' or '30m'.
    - **high:** Serious insults, threats, or hate speech. Suggest 'mute' and propose a longer duration like '2h' or '24h'.
    - **critical:** Extreme hate speech, credible threats, or severe spam. If the user has a history of 'high' or 'critical' offenses, suggest 'ban'. Otherwise, suggest 'kick'.

4.  If the message is **not toxic at all**, set 'isToxic' to **false** and all other fields to their "none" or empty state.
5.  The 'reason' field MUST be in **French**.

---
**ANALYSIS DETAILS:**
-   **Message Content:** "{{{messageContent}}}"
-   **User:** '{{{userName}}}'
-   **Sensitivity Setting:** {{{sensitivity}}}
-   **User History:** {{#if userSanctionHistory.length}}User has prior sanctions.{{else}}Clean record.{{/if}}
-   **Conversation Context:**
    {{#each conversationContext}}
    - {{{this}}}
    {{/each}}
---
`
});


const flow = ai.defineFlow(
  {
    name: 'moderationAiFlow',
    inputSchema: ModerationAiInputSchema,
    outputSchema: ModerationAiOutputSchema,
  },
  async (input) => {
    const { output } = await filterPrompt(input);
    
    // Final check: if the AI still flags a non-toxic message, override it.
    if (output && !output.isToxic) {
        return { isToxic: false, reason: '', severity: 'none', suggestedAction: 'none' };
    }
    
    return output!;
  }
);
