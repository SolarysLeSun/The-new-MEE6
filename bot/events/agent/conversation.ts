

import { Events, Message, Collection, EmbedBuilder, TextChannel, AttachmentBuilder } from 'discord.js';
import { getServerConfig, addKnowledgeBaseItem, getUserSanctionHistory, getUserLevel } from '../../../src/lib/db';
import { conversationalAgentFlow } from '../../../src/ai/flows/conversational-agent-flow';
import { knowledgeCreationFlow } from '../../../src/ai/flows/knowledge-creation-flow';
import { faqFlow } from '../../../src/ai/flows/faq-flow';
import { generateImage } from '../../../src/ai/flows/content-creation-flow';
import fetch from 'node-fetch';

const imageMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

// Cache to store conversation history for dedicated channels
const conversationHistory = new Collection<string, { user: string; content: string }[]>();
const HISTORY_LIMIT = 10; // Keep the last 10 messages

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


async function handleFaqScan(message: Message) {
    if (!message.guild || message.author.bot || !message.content) return;

    const config = await getServerConfig(message.guild.id, 'community-assistant');
    if (!config?.enabled || !config.premium || !config.faq_scan_enabled) {
        return;
    }

    const knowledgeBase = config.knowledge_base || [];
    if (knowledgeBase.length === 0) return;

    // A simple trigger: check if the message is a question
    if (!message.content.endsWith('?')) return;

    try {
         const result = await faqFlow({
            userQuestion: message.content,
            knowledgeBase: knowledgeBase,
            confidenceThreshold: config.confidence_threshold || 75,
        });

        if (result.isConfident && result.answer) {
             const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle(`Réponse possible à votre question`)
                .setDescription(result.answer)
                .setFooter({ text: `Basé sur la question : "${result.matchedQuestion}"`});
            await message.reply({ embeds: [embed] });
        }
    } catch (error) {
        console.error('[FaqScan] Error executing faqFlow:', error);
    }
}


async function handleConversationalAgent(message: Message) {
    if (message.author.bot || !message.guild || !message.member) {
        return;
    }

    const config = await getServerConfig(message.guild.id, 'conversational-agent');

    // This check is slightly redundant because the calling function already checks for enabled.
    // However, it's good practice for a handler to be self-contained.
    if (!config?.enabled || !config.premium) {
        return;
    }

    const userMessage = message.content.replace(/<@!?\d+>/g, '').trim();
    const imageAttachment = message.attachments.find(att => imageMimeTypes.some(mime => att.contentType?.startsWith(mime)));
    
    // Don't respond to empty messages (e.g. a ping with no text)
    if (!userMessage && !imageAttachment) {
        return;
    }
    
    const isInDedicatedChannel = message.channel.id === config.dedicated_channel_id;
    console.log(`[Agent] Received message from ${message.author.tag} in ${message.guild.name}. Trigger: ${isInDedicatedChannel ? 'Dedicated Channel' : 'Mention'}`);

    try {
        await message.channel.sendTyping();

        let photoDataUri: string | undefined = undefined;
        if (imageAttachment) {
            photoDataUri = await imageUrlToDataUri(imageAttachment.url);
        }
        
        // --- Gather user context ---
        const userSanctionHistory = getUserSanctionHistory(message.guild.id, message.author.id);
        const userLevel = getUserLevel(message.author.id, message.guild.id);
        const userRoles = message.member.roles.cache.map(r => r.name).filter(n => n !== '@everyone');


        // Fetch last 5 messages for context, unless it's a dedicated channel (which has its own history)
        let historyForPrompt: { user: string, content: string }[] = [];
        if (isInDedicatedChannel) {
            const currentHistory = conversationHistory.get(message.channel.id) || [];
            historyForPrompt = [...currentHistory]; 

            currentHistory.push({ user: message.member.displayName, content: userMessage });
            if (currentHistory.length > HISTORY_LIMIT) {
                currentHistory.shift();
            }
            conversationHistory.set(message.channel.id, currentHistory);
        } else {
             const lastMessages = await message.channel.messages.fetch({ limit: 5, before: message.id });
             historyForPrompt = lastMessages.map(m => ({ user: m.author.username, content: m.content })).reverse();
        }

        const result = await conversationalAgentFlow({
            serverName: message.guild.name,
            userMessage: userMessage,
            userName: message.member.displayName,
            userRoles,
            userLevel,
            agentName: config.agent_name,
            agentRole: config.agent_role,
            agentPersonality: config.agent_personality,
            customPrompt: config.custom_prompt,
            knowledgeBase: config.knowledge_base,
            conversationHistory: historyForPrompt,
            userSanctionHistory: userSanctionHistory,
            photoDataUri: photoDataUri,
            allow_imagination: config.allow_imagination,
            allow_freewheeling: config.allow_freewheeling,
            allow_image_generation: config.allow_image_generation,
        });

        if (result.response || result.image_prompt) {
            let files: AttachmentBuilder[] = [];
            if (result.image_prompt) {
                console.log(`[Agent] Generating image with prompt: "${result.image_prompt}"`);
                try {
                    const imageResult = await generateImage({ prompt: result.image_prompt, allow_nsfw: config.allow_freewheeling });
                    if (imageResult.imageDataUri) {
                        const imageBuffer = Buffer.from(imageResult.imageDataUri.split(',')[1], 'base64');
                        files.push(new AttachmentBuilder(imageBuffer, { name: 'agent_image.png' }));
                    }
                } catch (imgError) {
                    console.error(`[Agent] Image generation failed:`, imgError);
                }
            }
            
            try {
                // Use channel.send instead of reply to avoid errors if original message is deleted
                await message.channel.send({ content: result.response || undefined, files: files });
                
                if (isInDedicatedChannel) {
                    const currentHistory = conversationHistory.get(message.channel.id) || [];
                    currentHistory.push({ user: config.agent_name, content: result.response });
                    if (currentHistory.length > HISTORY_LIMIT) {
                        currentHistory.shift();
                    }
                    conversationHistory.set(message.channel.id, currentHistory);
                }

                // If the answer was imagined, save it to the knowledge base
                if (result.imagined_answer) {
                    console.log('[Agent] Imagined answer detected. Creating new knowledge item...');
                     // No need to await this, it can run in the background
                    knowledgeCreationFlow({ userQuestion: userMessage, agentResponse: result.response })
                        .then(newItem => {
                            addKnowledgeBaseItem(message.guild!.id, newItem);
                             console.log(`[Agent] New knowledge item created and saved for guild ${message.guild!.id}.`);
                        })
                        .catch(err => {
                             console.error('[Agent] Failed to create or save new knowledge item:', err);
                        });
                }
            } catch (replyError: any) {
                 if (replyError.code === 10008) { // Unknown Message
                    console.warn(`[Agent] Could not reply to message ${message.id} because it was deleted.`);
                } else {
                    throw replyError; // Re-throw other errors
                }
            }
        }

    } catch (error: any) {
        console.error('[Agent] Error during conversational agent flow:', error);
        
        let errorMessage = "Désolé, une erreur est survenue pendant que je réfléchissais. Veuillez réessayer.";

        // --- Handle specific error statuses ---
        if (error.status === 429) { // Quota Exceeded
            errorMessage = "Désolé, j'ai atteint ma limite de requêtes pour aujourd'hui. Veuillez réessayer demain.";
            // Optionally, notify bot owners
            const ownerIds = ['556529963877138442', '760977578839506985', '800041004400902145'];
            const ownerMessage = `🚨 **Erreur de Quota API Gemini** 🚨\n\nLe bot a atteint sa limite sur le serveur **${message.guild.name}**.`;
            for (const id of ownerIds) {
                try {
                    const user = await message.client.users.fetch(id);
                    await user.send(ownerMessage);
                } catch (dmError) {
                    console.error(`[Agent Error] Impossible d'envoyer un DM d'erreur de quota à l'utilisateur ${id}`, dmError);
                }
            }
        } else if (error.status === 503) { // Service Unavailable
            errorMessage = "Les services de l'IA (Google) sont actuellement indisponibles ou surchargés. Veuillez réessayer dans quelques instants.";
        }

        try {
            await message.channel.send(errorMessage);
        } catch (finalError: any) {
            console.error('[Agent] Failed to send error message:', finalError);
        }
    }
}


export const name = Events.MessageCreate;
export const once = false;
export async function execute(message: Message) {
    if (message.author.bot || !message.guild) return;

    // Determine if the message is for the conversational agent
    const agentConfig = await getServerConfig(message.guild.id, 'conversational-agent');
    const isForAgent =
        agentConfig?.enabled && agentConfig.premium &&
        (message.channel.id === agentConfig.dedicated_channel_id || message.mentions.has(message.client.user.id));
    
    // If it's for the agent, let it handle it exclusively.
    if (isForAgent) {
        await handleConversationalAgent(message);
        return; // Stop further processing
    }

    // Otherwise, run other message-based scans like the FAQ scan.
    await handleFaqScan(message);
}
