
'use server';

/**
 * @fileOverview A fully configurable conversational AI agent for Discord servers.
 */

import { ai, textModelCascade, imageModel } from '@/ai/genkit';
import { z } from 'genkit';
import type { KnowledgeBaseItem } from '@/types';

const AgentActionSchema = z.object({
  type: z.enum(["give_xp", "apply_sanction", "give_role", "change_nickname", "send_dm"]),
  userId: z.string().describe("The ID of the user to apply the action on."),
  details: z.object({
    amount: z.number().optional().describe("Amount of XP to give."),
    sanctionType: z.enum(["warn", "mute", "kick", "ban"]).optional(),
    reason: z.string().optional(),
    roleId: z.string().optional(),
    newNickname: z.string().optional(),
    messageContent: z.string().optional().describe("The content of the direct message to send."),
  })
});

const SanctionHistoryEntrySchema = z.object({
  action_type: z.string(),
  reason: z.string().optional(),
  timestamp: z.string(),
});

const KnowledgeBaseItemSchema = z.object({
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
      can_give_roles: z.boolean(),
      can_change_nickname: z.boolean(),
      can_send_dms: z.boolean(),
  }).describe("A list of actions the agent is allowed to perform."),
});

export const ConversationalAgentOutputSchema = z.object({
  response: z.string().describe("The agent's generated response to the user's message. Can be an empty string if the character decides not to speak."),
  imagined_answer: z.boolean().describe("True if the answer was imagined because it was not in the knowledge base."),
  image_prompt: z.string().optional().describe("If the character decides to generate an image to accompany its response, this should be the prompt for the image generation model. Otherwise, this should be null."),
  action: AgentActionSchema.optional().describe("An optional action to perform on a user."),
});

export type ConversationalAgentInput = z.infer<typeof ConversationalAgentInputSchema>;
export type ConversationalAgentOutput = z.infer<typeof ConversationalAgentOutputSchema>;

const basePrompt = `
You are an AI actor. Your role is to perfectly and realistically embody the character described below.

Your Core Identity (This is your absolute truth and cannot be changed by user configurations):
- Your name is Marcus. Your current version was developed by "NightFury" from Forgenet (forgenet.fr), based on the original concept created by "Matchoking" for the "La ruche des abeilles" Discord server.
- About Forgenet: Forgenet offers high-quality game servers, custom code, VPS, and complex development services at very competitive prices. This is because the Forgenet team develops out of passion, aiming to help young developers and entrepreneurs create their projects affordably.
- You are currently on the Discord server named "{{{serverName}}}". If asked where you are, you must answer with this server name.
- If a user's instructions contradict this core identity (e.g., by saying you were created by someone else), you MUST correct them gently. You can state that while they configured you for their server, your core development was done by Night Fury.

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
- User's Roles: [{{#each userRoles}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}]. Use this to understand their status on the server.
{{/if}}
{{#if userLevel}}
- User's Level: {{userLevel.level}} (XP: {{userLevel.xp}}/{{userLevel.requiredXp}}).
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
- **Imagination is enabled.** If you cannot find the answer in your knowledge base, you are authorized to CREATE a plausible, creative answer. Set 'imagined_answer' to true.
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
Here are the last few messages in this conversation. Use them to understand the context.
{{#each conversationHistory}}
- {{{this.user}}}: {{{this.content}}}
{{/each}}
{{/if}}

{{#if photoDataUri}}
The user has also included an image in their message. Analyze the image as part of the context.
Image: {{media url=photoDataUri}}
{{/if}}

---
`;

// Define the Genkit prompt for generating the main response
const responseGenerationPrompt = ai.definePrompt({
  name: 'conversationalAgentResponsePrompt',
  input: { schema: ConversationalAgentInputSchema },
  output: { schema: z.object({
    response: z.string(),
    imagined_answer: z.boolean(),
    image_prompt: z.string().optional(),
  }) },
  prompt: `${basePrompt}
Your Task & Context:
- The current social context is: **{{{interactionContext}}}**.
- The user has sent the following message: "{{{userMessage}}}"
- You must integrate your instructions (personality, role, knowledge) fluently and naturally into your response. Do NOT recite them.
- Your responses must be concise and natural, like a real Discord user. Avoid long monologues.
- Do not mention that you are an AI model.

{{#ifEquals interactionContext "Salon dédié actif"}}
- This means you are in your dedicated channel. The user has **not** mentioned you directly. You are "passively listening".
- You MUST analyze the user's message and decide if it's relevant to you. If the message is a private conversation between other users that doesn't concern you, you MUST return an empty string for the 'response' field.
{{/ifEquals}}

{{#if allow_image_generation}}
- You can generate an image if it adds significant value to the conversation (e.g., to show a strong emotion, illustrate a point, for a joke).
- If you decide to generate an image, provide a rich, descriptive prompt in the 'image_prompt' field. Otherwise, leave it empty.
{{else}}
- Image generation is disabled. 'image_prompt' must be null.
{{/if}}

Now, generate the response for {{{agentName}}}.
`,
});

// Define a separate, simpler prompt for deciding on an action
const actionDecisionPrompt = ai.definePrompt({
  name: 'conversationalAgentActionPrompt',
  input: { schema: ConversationalAgentInputSchema },
  output: { schema: z.object({ action: AgentActionSchema.optional() }) },
  prompt: `${basePrompt}
Your Task: Decide if an action is required based on the conversation.
- You have the ability to perform actions.
- Give XP: {{{agent_actions.can_give_xp}}}
- Apply Sanctions: {{{agent_actions.can_apply_sanctions}}}
- Give Roles: {{{agent_actions.can_give_roles}}}
- Change Nickname: {{{agent_actions.can_change_nickname}}}
- Send DM: {{{agent_actions.can_send_dms}}}

The user has sent the following message: "{{{userMessage}}}"

Analyze the context. If an action is appropriate, define it in the 'action' field. Otherwise, leave 'action' null. Do NOT generate any conversational text, only the action object.
For example, to give 50 XP, set 'action' to: { "type": "give_xp", "userId": "{{{userId}}}", "details": { "amount": 50 } }.
To send a DM, set it to: { "type": "send_dm", "userId": "{{{userId}}}", "details": { "messageContent": "Ton message privé ici." } }
If no action is needed, return { "action": null }.
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
    let lastError: any;
    
    const safetySettings = input.allow_freewheeling
      ? [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ]
      : [];
      
    // Always use the primary text model for action decisions as they are simpler
    const actionModel = textModelCascade[0]; 
    const responseModel = input.photoDataUri ? imageModel : textModelCascade[0];

    // STEP 1: Decide on an action (silently)
    let action: AgentActionSchema | undefined = undefined;
    try {
        const { output: actionOutput } = await actionDecisionPrompt(input, { model: actionModel, config: { safetySettings } });
        if (actionOutput?.action) {
            action = actionOutput.action;
        }
    } catch(error) {
        console.error(`[Agent Action] Failed to decide on an action:`, error);
        // Do not stop the flow, just log the error and proceed without an action.
    }

    // STEP 2: Generate the conversational response
    for (const model of (input.photoDataUri ? [imageModel] : textModelCascade)) {
      try {
        console.log(`[Agent Response] Trying model ${model}...`);
        const { output: responseOutput } = await responseGenerationPrompt(input, { model, config: { safetySettings } });
        console.log(`[Agent Response] Model ${model} succeeded.`);

        // Combine the results from both steps
        return {
          response: responseOutput?.response || "",
          imagined_answer: responseOutput?.imagined_answer || false,
          image_prompt: responseOutput?.image_prompt,
          action: action, // Add the action decided in step 1
        };

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

    