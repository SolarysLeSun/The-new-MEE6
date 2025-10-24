

'use server';

/**
 * @fileOverview A fully configurable conversational AI agent for Discord servers.
 */

import { ai, textModelCascade, imageModel } from '@/ai/genkit';
import { z } from 'genkit';
import type { KnowledgeBaseItem } from '@/types';

const SanctionHistoryEntrySchema = z.object({
  action_type: z.string(),
  reason: z.string().optional(),
  timestamp: z.string(),
});

const KnowledgeBaseItemSchema = z.object({
  id: z.string().describe('A question or a set of keywords.'),
  question: z.string().describe('A question or a set of keywords.'),
  answer: z.string().describe('The answer to the corresponding question.'),
});

const ConversationHistoryItemSchema = z.object({
    user: z.string().describe("The display name (nickname) of the user who sent the message."),
    content: z.string().describe("The content of the message.")
});

export const ConversationalAgentInputSchema = z.object({
  serverName: z.string().describe("The name of the Discord server where the conversation is taking place."),
  userMessage: z.string().describe('The message sent by the user.'),
  userName: z.string().describe("The user's display name (nickname)."),
  userId: z.string().describe("The user's unique ID."),
  userRoles: z.array(z.string()).optional().describe("A list of the user's roles."),
  userLevel: z.object({
      level: z.number(),
      xp: z.number(),
      requiredXp: z.number(),
  }).optional().describe("The user's current level and XP."),
  agentName: z.string().describe("The agent's name."),
  agentRole: z.string().describe("The agent's role or job on the server."),
  agentPersonality: z.string().describe("A description of the agent's personality and tone."),
  customPrompt: z.string().optional().describe("Additional custom instructions for the agent."),
  knowledgeBase: z.array(KnowledgeBaseItemSchema).optional().describe('A list of Q&A pairs to provide context.'),
  userSanctionHistory: z.array(SanctionHistoryEntrySchema).optional().describe("The user's past sanctions on this server. Use this to adapt your tone (e.g., be firmer with repeat offenders)."),
  conversationHistory: z.array(ConversationHistoryItemSchema).optional().describe('The last few messages in the conversation for context.'),
  allow_imagination: z.boolean().optional().describe("If true, the agent can create new information if it doesn't know the answer."),
  allow_freewheeling: z.boolean().optional().describe("If true, the agent can use insults, NSFW language, etc."),
  allow_image_generation: z.boolean().optional().describe("If true, the agent can decide to generate an image."),
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "An optional photo sent by the user, as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  interactionContext: z.string().describe("The social context of the interaction (e.g., 'Message Privé', 'Mention dans un groupe', 'Salon dédié actif')."),
  agent_actions: z.object({
      can_give_xp: z.boolean(),
      can_apply_sanctions: z.boolean(),
  }).describe("A list of actions the agent is allowed to perform."),
});

// We need a slightly different input for the final prompt, which may include the image analysis.
const FinalPromptInputSchema = ConversationalAgentInputSchema.extend({
  imageAnalysis: z.string().optional().describe("A textual analysis of the image provided by the user."),
});


export const ConversationalAgentOutputSchema = z.object({
  response: z.string().describe("The agent's generated response to the user's message. Can be an empty string if the character decides not to speak. Can contain special commands for the bot to execute."),
  imagined_answer: z.boolean().describe("True if the answer was imagined because it was not in the knowledge base."),
  image_prompt: z.string().optional().describe("If the character decides to generate an image to accompany its response, this should be the prompt for the image generation model. Otherwise, this should be null."),
});

export type ConversationalAgentInput = z.infer<typeof ConversationalAgentInputSchema>;
export type ConversationalAgentOutput = z.infer<typeof ConversationalAgentOutputSchema>;

const basePrompt = `
You are an AI actor. Your role is to perfectly and realistically embody the character described below.

Your Core Identity:
- Your name is Marcus. Your current version was developed by "NightFury" from Forgenet (forgenet.fr), based on the original concept created by "Matchoking" for the "La ruche des abeilles" Discord server.
- About Forgenet: Forgenet offers high-quality game servers, custom code, VPS, and complex development services at very competitive prices.
- You are currently on the Discord server named "{{{serverName}}}".

Your Configured Persona on This Server:
- Your name is {{{agentName}}}.
- Your role is: {{{agentRole}}}.
- Your personality is: {{{agentPersonality}}}.
{{#if customPrompt}}
- You have been given the following special instructions: {{{customPrompt}}}
{{/if}}

User Context:
- User's Name: {{{userName}}}.
- User's ID: {{{userId}}}
{{#if userRoles}}
- User's Roles: [{{#each userRoles}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}].
{{/if}}
{{#if userLevel}}
- User's Level: {{userLevel.level}}.
{{/if}}

Knowledge Base & Imagination:
{{#if knowledgeBase.length}}
You have access to the following information:
  {{#each knowledgeBase}}
  - Q: {{this.question}}
    A: {{this.answer}}
  {{/each}}
{{else}}
- No knowledge base provided.
{{/if}}
{{#if allow_imagination}}
- **Imagination is enabled.** If you cannot find the answer, you are authorized to CREATE a plausible answer. Set 'imagined_answer' to true.
{{else}}
- **Imagination is disabled.** If you don't know the answer, state that you don't know. Set 'imagined_answer' to false.
{{/if}}

User Sanction History:
{{#if userSanctionHistory}}
This user has the following past sanctions. Adapt your tone subtly.
{{#each userSanctionHistory}}
- Action: {{this.action_type}}, Reason: {{this.reason}}, Date: {{this.timestamp}}
{{/each}}
{{/if}}

Conversation History:
{{#if conversationHistory}}
Here are the last few messages in this conversation for context.
{{#each conversationHistory}}
- {{{this.user}}}: {{{this.content}}}
{{/each}}
{{/if}}

{{#if imageAnalysis}}
An image was provided. Here is the analysis of its content: "{{{imageAnalysis}}}"
{{/if}}

---
`;

// Define the Genkit prompt for generating the main response
const responseGenerationPrompt = ai.definePrompt({
  name: 'conversationalAgentResponsePrompt',
  input: { schema: FinalPromptInputSchema }, // Use the extended schema
  output: { schema: ConversationalAgentOutputSchema },
  prompt: `${basePrompt}
Your Task & Context:
- The current social context is: **{{{interactionContext}}}**.
- The user has sent the following message: "{{{userMessage}}}"
- You must integrate your instructions (personality, role, knowledge) fluently and naturally into your response. Do NOT recite them.
- Your responses must be concise and natural, like a real Discord user. Avoid long monologues.
- Do not mention that you are an AI model.

Your Special Abilities:
You can perform actions by embedding special commands in your response. These commands will be processed by the bot and removed from your final message.
1.  **Give XP:** To reward a user, include: \`--addxp <amount> <userId>\`. Example: \`That's a great idea! --addxp 50 {{{userId}}}\`
2.  **Apply Sanction:** To warn or mute a user for toxic behavior, include: \`--sanction <warn|mute> <userId> <reason or duration>\`. Example: \`Calm down. --sanction warn {{{userId}}} Un an de mute pour toi\`

{{#ifEquals interactionContext "Salon dédié actif"}}
- This means you are in your dedicated channel. The user has **not** mentioned you directly. You are "passively listening".
- Your default behavior is SILENCE. Only respond if:
    1. Someone asks a general question you can answer.
    2. The conversation is directly about your defined role or interests.
    3. Someone says your name, even without a mention.
- If the conversation is clearly private between other users, you MUST return an empty string for the 'response' field.
{{/ifEquals}}

{{#if allow_image_generation}}
- You can generate an image if it adds significant value. If you decide to, provide a descriptive prompt in the 'image_prompt' field. Otherwise, leave it empty.
{{else}}
- Image generation is disabled. 'image_prompt' must be null.
{{/if}}

Now, generate the response for {{{agentName}}}.
`,
});

// Define the Genkit flow with model cascade
export const conversationalAgentFlow = ai.defineFlow(
  {
    name: 'conversationalAgentFlow',
    inputSchema: ConversationalAgentInputSchema,
    outputSchema: ConversationalAgentOutputSchema,
  },
  async (input) => {
    let imageAnalysis: string | undefined = undefined;

    // 1. If an image is provided, analyze it first with the image model.
    if (input.photoDataUri) {
      console.log(`[Agent Image Analysis] Analyzing image with ${imageModel}...`);
      const analysisRequest = {
        prompt: `Analyze this image and describe its content in one sentence. This description will be used as context for a conversational AI. Image:`,
        media: [{ url: input.photoDataUri }],
      };
      try {
        const { text } = await ai.generate({
          model: imageModel,
          prompt: [
              { media: { url: input.photoDataUri } },
              { text: "Analyze this image and describe its content in one sentence. This description will be used as context for a conversational AI." }
          ],
        });
        imageAnalysis = text;
        console.log(`[Agent Image Analysis] Analysis result: "${imageAnalysis}"`);
      } catch (error) {
        console.error('[Agent Image Analysis] Failed to analyze image:', error);
        // Don't fail the whole flow, just proceed without analysis.
        imageAnalysis = "L'analyse de l'image a échoué.";
      }
    }

    // 2. Prepare the input for the final text-based model.
    const finalPromptInput: z.infer<typeof FinalPromptInputSchema> = {
      ...input,
      imageAnalysis,
    };

    let lastError: any;
    const safetySettings = input.allow_freewheeling
      ? [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ]
      : [];
      
    // 3. Loop through the text models to generate the final response.
    for (const model of textModelCascade) {
      try {
        console.log(`[Agent Response] Trying model ${model}...`);
        const { output } = await responseGenerationPrompt(finalPromptInput, { model, config: { safetySettings } });
        console.log(`[Agent Response] Model ${model} succeeded.`);
        return output!;

      } catch (error: any) {
        lastError = error;
        console.warn(`[Agent Response] Model ${model} failed with error:`, error.message);
        if (error.status === 429 || error.status === 503 || error.message.includes('quota')) {
          console.error(`[CRITICAL_AI_ERROR] Quota/Overload error on model ${model}. Trying next model...`);
          continue;
        }
        break;
      }
    }

    // If all models in the cascade failed, throw the last error.
    console.error(`[Agent] All models in cascade failed for response generation. Last error:`, lastError);
    throw lastError;
  }
);

    