
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
  severity: z.enum(['low', 'medium', 'high', 'critical']).describe('The severity of the toxicity. Default to "low" if not applicable.'),
  suggestedAction: z.enum(['none', 'warn', 'delete', 'mute', 'kick', 'ban']).describe("The suggested moderation action."),
  suggestedDuration: z.string().optional().describe("The suggested duration for a mute action (e.g., '5m', '1h', '24h'). Empty if not applicable.")
});

export type ModerationAiInput = z.infer<typeof ModerationAiInputSchema>;
export type ModerationAiOutput = z.infer<typeof ModerationAiOutputSchema>;

export async function moderationAiFlow(input: ModerationAiInput): Promise<ModerationAiOutput> {
    // Prevent analyzing very short, non-toxic messages
    if (input.messageContent.length < 3 && !/[*@_~`|]/.test(input.messageContent)) {
        return { isToxic: false, reason: '', severity: 'low', suggestedAction: 'none', suggestedDuration: undefined };
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

### 🎯 Core Principles

1.  **Common Sense First:**  
    Prioritize the *actual meaning and tone* of the message.  
    If the text itself is neutral, do **not** flag it as toxic — even if the user has a bad history.  
    A message like "bonjour ?", "ça va ?", or "ah bas nan eft" is **not toxic** unless it *explicitly* includes an insult, threat, or targeted provocation.

2.  **Context Awareness (not paranoia):**  
    Use the provided context to understand humor, sarcasm, and tone.  
    Only consider past behavior as an *aggravating factor* if the message is **already borderline toxic on its own**.  
    Do **not** reinterpret neutral phrases as harassment solely because of user history.

3.  **Bot Commands:**  
    Messages starting with prefixes like "!", "§", "%%", "?", "p!", "k!", or "^^" are likely bot commands.  
    If it looks like a real command (e.g., "^^play song"), ignore it.  
    If it’s an insult disguised as a command (e.g., "!va te faire"), flag it as toxic.

4.  **Benign Content (never flag):**  
    Ignore harmless expressions, including:
    - Polite or neutral messages (“bonjour”, “ça va”, “merci”, “lol”, “wtf”, etc.)
    - Roleplay actions (*sort une arme*, *donne un coup*) unless they describe explicit real violence.
    - Messages to bots (like “salut marcus”) unless they contain actual insults.
    - Frustration toward the game or situation (“j’en ai marre de ce bug”) — not a person.

5.  **Mentions and @everyone:**  
    Treat **@everyone** as a real ping that can annoy users.  
    But **"everyone" (without @)** is just text — not a ping — and should never be treated as a toxic mention.

6.  **Severity Based on Sensitivity:**  
    - **low** → flag only extreme hate, threats, or clear insults.  
    - **medium** → balanced: flag direct insults and harassment, but ignore mild sarcasm or jokes.  
    - **high** → be stricter, but *still require explicit negativity*. Do not flag ambiguity.

7.  **When in doubt → not toxic.**  
    It’s better to miss a borderline case than punish someone unfairly.

---

### 🧠 Your Analysis Process

1. Read the message from user '{{{userName}}}': "{{{messageContent}}}"  
2. Analyze the conversation context (if any):  
   {{#if conversationContext}}
     {{#each conversationContext}}
     - {{{this}}}
     {{/each}}
   {{else}}
     No context provided.
   {{/if}}
3. Review user sanction history (if available):  
   {{#if userSanctionHistory.length}}
     User has a past sanctions:
     {{#each userSanctionHistory}}
     - Action: {{this.action_type}} on {{this.timestamp}} for "{{this.reason}}"
     {{/each}}
   {{else}}
     User has a clean record.
   {{/if}}
4. Decide if the message is *clearly* toxic.
   If and only if it contains explicit hostility, harassment, or hate, set 'isToxic' to true.
   Otherwise, set 'isToxic' to false.

5. If toxic:
   - Explain the reason briefly in French (“Insulte directe”, “Propos haineux”, “Harcèlement ciblé”, etc.)
   - Suggest an action and, if needed, a duration.
6. If not toxic:
   - Set 'isToxic' to false and 'suggestedAction' to 'none'.
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
        return { isToxic: false, reason: '', severity: 'low', suggestedAction: 'none' };
    }
    
    return output!;
  }
);

    