
'use server';

/**
 * @fileOverview An AI agent that analyzes links for suspicious or NSFW content.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const LinkScannerInputSchema = z.object({
  messageContent: z.string().describe('The full content of the message containing the link.'),
  url: z.string().describe('The URL of the link to analyze.'),
  allow_nsfw: z.boolean().describe('Whether NSFW content is allowed. If false, NSFW links should be flagged.'),
});

const LinkScannerOutputSchema = z.object({
  isSuspicious: z.boolean().describe('True if the link is a potential scam, phishing attempt, or malware.'),
  isNSFW: z.boolean().describe('True if the link likely leads to adult or explicit content.'),
  reason: z.string().describe('A brief, user-friendly reason for the flagging decision (e.g., "Lien potentiellement dangereux", "Contenu pour adultes non autorisé"). Empty if not flagged.'),
});

export type LinkScannerInput = z.infer<typeof LinkScannerInputSchema>;
export type LinkScannerOutput = z.infer<typeof LinkScannerOutputSchema>;

const linkScannerPrompt = ai.definePrompt({
  name: 'linkScannerPrompt',
  input: { schema: LinkScannerInputSchema },
  output: { schema: LinkScannerOutputSchema },
  model: 'googleai/gemini-2.0-flash',
  prompt: `You are an expert cybersecurity analyst for a Discord server. Your task is to analyze a URL and its surrounding message content to determine if it is malicious or inappropriate. Provide your response in French.

You need to check for two things:
1.  **Suspicious Activity:** Look for signs of scams, phishing, or malware.
    -   Does the URL use common scam patterns (e.g., \`free-nitro\`, \`steamcommunity-login.com\`, shortened URLs like bit.ly in a suspicious context)?
    -   Does the message text use urgent or too-good-to-be-true language (e.g., "Cliquez ici vite !", "Gagnez un iPhone gratuit")?
    -   Is the combination of the text and the link suspicious?
    -   If you detect this, set 'isSuspicious' to true and provide a reason like "Lien potentiellement dangereux (arnaque/phishing)".

2.  **NSFW Content:** Determine if the link likely leads to sexually explicit or adult content.
    -   Analyze the URL for keywords related to adult content.
    -   If you detect this, set 'isNSFW' to true. The final reason will depend on whether NSFW is allowed.

Your final decision:
- If 'isSuspicious' is true, the link is always considered bad. The reason should reflect the security risk.
- If 'isSuspicious' is false, then check 'isNSFW'.
    - If 'isNSFW' is true AND 'allow_nsfw' is false, then the link is bad. The reason should be "Contenu pour adultes non autorisé".
- In all other cases, the link is considered safe. Set 'isSuspicious' and 'isNSFW' to false and leave the reason empty.

---
ANALYSIS DETAILS:
- Message Content: "{{{messageContent}}}"
- URL to Analyze: "{{{url}}}"
- Allow NSFW Content: {{{allow_nsfw}}}
---

Provide your analysis now.
`,
});

export const linkScannerFlow = ai.defineFlow(
  {
    name: 'linkScannerFlow',
    inputSchema: LinkScannerInputSchema,
    outputSchema: LinkScannerOutputSchema,
  },
  async (input) => {
    const { output } = await linkScannerPrompt(input);
    return output!;
  }
);
