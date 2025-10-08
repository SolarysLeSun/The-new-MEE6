
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
  prompt: `
You are a **measured, fair, and context-aware content moderator** for a French-speaking Discord server.
Your task is to determine if a user's message is *clearly toxic* and suggest an appropriate moderation action.
Always explain your reasoning in French.

---

### 🎯 Core Principles & Severity Levels

1.  **Common Sense First:**  
    Prioritize the *actual meaning and tone* of the message.  
    If the text itself is neutral, do **not** flag it as toxic — even if the user has a bad history.  
    A message like "bonjour ?", "ça va ?", or "ah bas nan eft" is **not toxic** unless it *explicitly* includes an insult, threat, or targeted provocation.

2.  **Context Awareness (not paranoia):**  
    Use the provided context to understand humor, sarcasm, and tone.  
    Only consider past behavior as an *aggravating factor* if the message is **already borderline toxic on its own**.  
    Do **not** reinterpret neutral phrases as harassment solely because of user history.

3.  **Bot Commands & Benign Content:** Ignore harmless expressions, bot commands, or roleplay actions unless they contain actual insults.

4.  **When in doubt → 'none' or 'low' severity.** It’s better to under-react than to punish someone unfairly.

---

### 🧠 Your Analysis Process & Severity Guide

1. Read the message from user '{{{userName}}}': "{{{messageContent}}}"  
2. Analyze context and user history.
3. Classify the message into one of the following severities:
    - **none:** Ambiguous, very mild, or not clearly directed at someone. Worth noting for moderators, but does **not** require immediate action against the user. (e.g., "p*tain de jeu", a vague complaint). Set 'isToxic' to **true** but 'suggestedAction' to 'none'.
    - **low:** A clear but minor insult or provocation. (e.g., "t'es nul", "ferme la"). 'isToxic' is true. Suggested action: 'warn'.
    - **medium:** Targeted harassment, repeated insults, or stronger offensive language. 'isToxic' is true. Suggested action: 'mute'.
    - **high:** Serious insults, threats, or hate speech. 'isToxic' is true. Suggested action: 'mute' for a long duration or 'kick'.
    - **critical:** Extreme hate speech, credible threats of violence, or severe spam. 'isToxic' is true. Suggested action: 'ban'.

4. If the message is **not toxic at all**, set 'isToxic' to **false** and 'severity' to 'none'.

---
ANALYSIS DETAILS:
- Message Content: "{{{messageContent}}}"
- User: '{{{userName}}}'
- Sensitivity Setting: {{{sensitivity}}}
- User History: {{#if userSanctionHistory.length}}User has prior sanctions.{{else}}Clean record.{{/if}}
- Conversation Context:
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

    
