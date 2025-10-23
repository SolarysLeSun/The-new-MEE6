'use server';

/**
 * @fileOverview AI flow for generating and interacting with AI personas.
 */

import { ai, imageModel, textModelCascade } from '@/ai/genkit';
import { z } from 'genkit';
import type { ConversationHistoryItem, PersonaMemory } from '@/types';


// --- Persona Avatar Generation ---
const PersonaAvatarInputSchema = z.object({
    name: z.string().describe("The name of the character."),
    persona_prompt: z.string().describe("The detailed persona description."),
});
export type PersonaAvatarInput = z.infer<typeof PersonaAvatarInputSchema>;

const PersonaAvatarOutputSchema = z.object({
    avatarDataUri: z.string().describe("The generated avatar image as a data URI."),
});
export type PersonaAvatarOutput = z.infer<typeof PersonaAvatarOutputSchema>;

export async function generatePersonaAvatar(input: PersonaAvatarInput): Promise<PersonaAvatarOutput> {
    const { media } = await ai.generate({
        model: imageModel,
        prompt: `Create a square avatar for a character named "${input.name}". Description: ${input.persona_prompt}. The style should be an anime or digital art portrait, focusing on the face.`,
        config: {
            responseModalities: ['IMAGE', 'TEXT'],
        },
    });

    if (!media.url) {
        throw new Error("Avatar generation failed.");
    }
    return { avatarDataUri: media.url };
}


// --- Persona Generation ---

const PersonaPromptInputSchema = z.object({
  name: z.string().describe("The name of the character to create."),
  instructions: z.string().describe("A set of instructions or a basic description for the character's personality."),
});

const PersonaPromptOutputSchema = z.object({
  personaPrompt: z.string().describe("A detailed, rich, and narrative description of the character's personality, backstory, age, appearance, behaviors, and relationships. This will be used as the main prompt for the character's interactions.")
});

export async function generatePersonaPrompt(input: z.infer<typeof PersonaPromptInputSchema>): Promise<{ personaPrompt: string }> {
  const { output } = await personaGenPrompt(input);
  return { personaPrompt: output!.personaPrompt };
}


const personaGenPrompt = ai.definePrompt({
    name: 'personaGenPrompt',
    input: { schema: PersonaPromptInputSchema },
    output: { schema: PersonaPromptOutputSchema },
    model: 'googleai/gemini-2.0-flash',
    prompt: `You are a master storyteller and character designer.
Your task is to create a rich and detailed persona for a new AI character that will live on a Discord server.
The persona should be written as a comprehensive prompt that will be fed to another AI to make it act as this character.
It should be detailed enough that an AI can maintain a consistent personality.

The user wants a character based on these guiding instructions: "{{{instructions}}}"
If the user provides a name ("{{{name}}}"), use it as a base, but you have creative freedom to change it if it fits the new persona better.

Based on this, generate a complete persona prompt. It must include:
- A clear identity (Nom, Âge, Genre).
- A detailed personality (traits, quirks, fears, desires, sense of humor).
- A brief backstory (where they come from, what they've done).
- Their role or purpose on the server.
- How they speak (tone, style, vocabulary, use of emojis).
- Their relationships or initial feelings towards other users or characters.
- **A daily or weekly schedule.** For example: "Works from 9 AM to 5 PM on weekdays," or "Is a night owl and is mostly active after 10 PM."

Make the persona compelling, unique, and coherent. This is the blueprint for the character's entire existence.
Write the final persona prompt now.
`,
});

// --- Persona Image Generation (separate flow) ---
const PersonaImageInputSchema = z.object({
  prompt: z.string().describe("A detailed description of the image to generate."),
});

const PersonaImageOutputSchema = z.object({
    imageDataUri: z.string().optional().describe("The generated image as a data URI."),
});

export type PersonaImageInput = z.infer<typeof PersonaImageInputSchema>;
export type PersonaImageOutput = z.infer<typeof PersonaImageOutputSchema>;

export async function generatePersonaImage(input: PersonaImageInput): Promise<PersonaImageOutput> {
    const { media } = await ai.generate({
        model: imageModel,
        prompt: input.prompt,
        config: {
            responseModalities: ['IMAGE', 'TEXT'],
        },
    });

    if (media.url) {
        return { imageDataUri: media.url };
    }

    return { imageDataUri: undefined };
}