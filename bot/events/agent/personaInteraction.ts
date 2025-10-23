

import { Events, Message, Collection, TextChannel, EmbedBuilder, AttachmentBuilder, DMChannel } from 'discord.js';
import { getServerConfig, getPersonasForGuild, getMemoriesForPersona, createMultipleMemories, getUserSanctionHistory, getUserLevel } from '../../../src/lib/db';
import { personaInteractionFlow, generatePersonaImage } from '@/ai/flows/persona-flow';
import { memoryFlow } from '@/ai/flows/memory-flow';
import type { Persona, ConversationHistoryItem } from '@/types';
import fetch from 'node-fetch';
import { ai, textModelCascade } from '@/ai/genkit';
import { defineFlow } from 'genkit';


const imageMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
const PERSONA_WEBHOOK_NAME = "Marcus Persona";
const COMMON_BOT_PREFIXES = /^[!§?%.^]/;


// Helper to convert image URL to data URI
async function imageUrlToDataUri(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const contentType = response.headers.get('content-type');
    if (!contentType || !imageMimeTypes.includes(contentType)) {
        throw new Error('Invalid content type for image.');
    }
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
}


// Cache conversation histories
const conversationHistory = new Collection<string, ConversationHistoryItem[]>();
const HISTORY_LIMIT = 20; // Increased history limit for better context

export const name = Events.MessageCreate;
export const once = false;

export async function execute(message: Message) {
    if (message.author.bot || !message.guild || !message.member) return;

    // --- Guild Message Handling ---
    const config = await getServerConfig(message.guild.id, 'ai-personas');
    if (!config?.enabled || !config.premium) {
        return;
    }

    const personas = getPersonasForGuild(message.guild.id);
    if (personas.length === 0) return;

    const activePersona = personas.find(p => p.active_channel_id === message.channel.id);
    const mentionedPersona = personas.find(p => p.role_id && message.mentions.roles.has(p.role_id));

    const triggeredPersona = activePersona || mentionedPersona;

    if (!triggeredPersona) {
        return;
    }
    
    // The persona should not respond to itself if it was somehow triggered by its own message via webhook.
    if (message.webhookId && message.author.username.toLowerCase() === triggeredPersona.name.toLowerCase()) {
        return;
    }

    // Pre-analysis: Ignore obvious bot commands
    if (COMMON_BOT_PREFIXES.test(message.content)) {
        console.log(`[Persona] Ignoring potential bot command from ${message.author.tag}.`);
        return;
    }
    
    // Check for image attachments in the user's message
    const imageAttachment = message.attachments.find(att => imageMimeTypes.some(mime => att.contentType?.startsWith(mime)));
    
    if (!message.content && !imageAttachment && !mentionedPersona) {
        return;
    }
    
    const interactionContext = activePersona ? 'Salon dédié actif' : 'Mention dans un groupe';
    console.log(`[Persona] Triggered: Persona "${triggeredPersona.name}" is processing a message from ${message.author.tag} in #${(message.channel as TextChannel).name}. Context: ${interactionContext}`);
    await handlePersonaInteraction(message, triggeredPersona, {id: message.guild.id, name: message.guild.name}, interactionContext);
}


async function handlePersonaInteraction(message: Message, persona: Persona, guild: {id: string, name: string}, interactionContext: string) {
     if (message.channel.isTextBased()) {
         await message.channel.sendTyping();
    }
    
    const imageAttachment = message.attachments.find(att => imageMimeTypes.some(mime => att.contentType?.startsWith(mime)));
    let photoDataUri: string | undefined = undefined;
    if (imageAttachment) {
        try {
            photoDataUri = await imageUrlToDataUri(imageAttachment.url);
        } catch (error) {
            console.error(`[Persona] Failed to process image for persona:`, error);
        }
    }

    const historyKey = message.channel.id;
    const currentHistory = conversationHistory.get(historyKey) || [];
    
    let messageTextForHistory = message.content;
    if (persona.role_id && message.mentions.roles.has(persona.role_id)) {
        messageTextForHistory = message.content.replace(`<@&${persona.role_id}>`, '').trim();
    }
    currentHistory.push({ user: message.author.username, content: messageTextForHistory });

    if (currentHistory.length > HISTORY_LIMIT) {
        currentHistory.shift();
    }
    conversationHistory.set(historyKey, currentHistory);

    // --- Gather all user context ---
    const relevantMemories = getMemoriesForPersona(persona.id, [message.author.id]);
    console.log(`[Persona] Retrieved ${relevantMemories.length} relevant memories for "${persona.name}".`);
    const userSanctionHistory = getUserSanctionHistory(guild.id, message.author.id);
    const userLevel = getUserLevel(message.author.id, guild.id);
    const userRoles = message.member?.roles.cache.map(r => r.name).filter(n => n !== '@everyone') || [];

    let result;
    let lastError: any;
    try {
        result = await personaInteractionFlow({
            serverName: guild.name,
            personaPrompt: persona.persona_prompt,
            conversationHistory: currentHistory, 
            memories: relevantMemories.map(m => ({ content: m.content, salience_score: m.salience_score })),
            userRoles,
            userLevel,
            userSanctionHistory: userSanctionHistory,
            photoDataUri: photoDataUri,
            interactionContext: interactionContext,
        });
    } catch (error: any) {
        lastError = error;
        console.error(`[Persona] Persona interaction flow failed. Error:`, error);
    }


    if (result) {
        if (result.response || result.image_prompt) {
            let files: AttachmentBuilder[] = [];
            if (result.image_prompt) {
                console.log(`[Persona] Persona "${persona.name}" wants to generate an image with prompt: "${result.image_prompt}"`);
                try {
                    const imageResult = await generatePersonaImage({ prompt: result.image_prompt });
                    if (imageResult.imageDataUri) {
                        const imageBuffer = Buffer.from(imageResult.imageDataUri.split(',')[1], 'base64');
                        files.push(new AttachmentBuilder(imageBuffer, { name: 'persona_image.png' }));
                    }
                } catch (imgError) {
                    console.error(`[Persona] Image generation failed for "${persona.name}":`, imgError);
                }
            }

            if (result.response || files.length > 0) {
                 if (message.channel instanceof DMChannel) {
                     await message.channel.send({ content: result.response || undefined, files: files });
                 } else if (message.channel instanceof TextChannel) {
                    const webhooks = await message.channel.fetchWebhooks();
                    let webhook = webhooks.find(wh => wh.name === PERSONA_WEBHOOK_NAME && wh.token !== null);

                    if (!webhook) {
                        webhook = await message.channel.createWebhook({
                            name: PERSONA_WEBHOOK_NAME,
                            reason: 'Webhook for AI Personas'
                        });
                    }
                    await webhook.send({
                        content: result.response || undefined,
                        username: persona.name,
                        avatarURL: persona.avatar_url || message.client.user?.displayAvatarURL(),
                        files: files
                    });
                 }
            }
            
            const updatedHistory = conversationHistory.get(historyKey) || [];
            if (result.response) {
                 updatedHistory.push({ user: persona.name, content: result.response });
            }
            if (updatedHistory.length > HISTORY_LIMIT) {
                updatedHistory.shift();
            }
            conversationHistory.set(historyKey, updatedHistory);

            console.log(`[Persona Memory] Triggering memory creation for "${persona.name}".`);
            memoryFlow({
                persona_id: persona.id,
                conversationTranscript: updatedHistory.map(h => `${h.user}: ${h.content}`).join('\n')
            }).then(newMemories => {
                if (newMemories && newMemories.length > 0) {
                     console.log(`[Persona Memory] Creating ${newMemories.length} new memories for ${persona.name}.`);
                     createMultipleMemories(newMemories);
                } else {
                    console.log(`[Persona Memory] No new significant memories to create for "${persona.name}".`);
                }
            }).catch(err => console.error(`[Persona Memory] Error creating memories for "${persona.name}":`, err));

        } else {
             console.log(`[Persona] Persona "${persona.name}" chose not to respond.`);
        }
    } else {
        let errorMessage = "Désolé, une erreur est survenue pendant que je réfléchissais. Veuillez réessayer.";

        if (lastError?.status === 429) {
            errorMessage = "Désolé, j'ai atteint ma limite de requêtes pour aujourd'hui. Veuillez réessayer demain.";
            const ownerIds = ['556529963877138442', '760977578839506985', '800041004400902145'];
            const ownerMessage = `🚨 **Erreur de Quota API Gemini** 🚨\n\nTous les modèles de la cascade ont échoué sur le serveur **${guild.name || 'DM'}**. Les fonctionnalités IA sont probablement indisponibles.\n\n**Détails de la dernière erreur :**\n\`\`\`json\n${JSON.stringify(lastError.errorDetails || { message: lastError.message }, null, 2)}\n\`\`\``;
            for (const id of ownerIds) {
                try {
                    const user = await message.client.users.fetch(id);
                    await user.send(ownerMessage);
                } catch (dmError) {
                    console.error(`[Persona Error] Impossible d'envoyer un DM d'erreur à l'utilisateur ${id}`, dmError);
                }
            }
        } else if (lastError?.status === 503) {
            errorMessage = "Les services de l'IA (Google) sont actuellement indisponibles ou surchargés. Veuillez réessayer dans quelques instants.";
        }
        
        try {
            await message.reply(errorMessage);
        } catch (replyError: any) {
            if (replyError.code !== 10008) { // Ignore "Unknown Message" error
                console.error('[Persona] Failed to send error message:', replyError);
            }
        }
    }
}
