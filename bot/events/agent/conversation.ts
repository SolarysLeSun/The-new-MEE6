

import { Events, Message, Collection, EmbedBuilder, TextChannel, AttachmentBuilder, User, Guild, ThreadChannel, ChannelType, ThreadAutoArchiveDuration } from 'discord.js';
import { getServerConfig, addKnowledgeBaseItem, getUserSanctionHistory, getUserLevel, updateUserXP, recordSanction } from '../../../src/lib/db';
import { conversationalAgentFlow } from '../../../src/ai/flows/conversational-agent-flow';
import { knowledgeCreationFlow } from '../../../src/ai/flows/knowledge-creation-flow';
import { faqFlow } from '../../../src/ai/flows/faq-flow';
import { generateImage } from '../../../src/ai/flows/content-creation-flow';
import fetch from 'node-fetch';
import { memoryFlow } from '@/ai/flows/memory-flow';
import type { Persona } from '@/types';

const imageMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

// Cache to store conversation history
const conversationHistory = new Collection<string, { user: string; content: string }[]>();
const HISTORY_LIMIT = 10;

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


export async function getOrCreatePrivateThread(guild: Guild, agent: Persona, user: User): Promise<ThreadChannel | null> {
    const privateChannelName = `mp-${agent.name.toLowerCase().replace(/\s/g, '-')}`;
    
    let channel = guild.channels.cache.find(c => c.name === privateChannelName && c.type === ChannelType.GuildText) as TextChannel;
    
    if (!channel) {
        channel = await guild.channels.create({
            name: privateChannelName,
            type: ChannelType.GuildText,
            topic: `Salon privé pour les conversations avec l'agent ${agent.name}.`,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: ['ViewChannel'],
                },
                {
                    id: guild.members.me!.id,
                    allow: ['ViewChannel', 'ManageThreads'],
                },
            ],
        }) as TextChannel;
    }

    const threadName = `MP-${user.username}`;
    let thread = channel.threads.cache.find(t => t.name === threadName);

    if (!thread) {
        thread = await channel.threads.create({
            name: threadName,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
            reason: `Conversation privée avec ${user.tag}`,
        });
        await thread.members.add(user.id);
    }
    
    return thread;
}

async function handleConversationalAgent(message: Message) {
    if (message.author.bot || !message.guild || !message.member) {
        return;
    }

    const config = await getServerConfig(message.guild.id, 'conversational-agent');
    if (!config?.enabled || !config.premium) {
        return;
    }
    
    const parentChannel = message.channel.isThread() ? await message.channel.parent?.fetch() : null;
    const isPrivateMessageThread = parentChannel?.name === `mp-${config.agent_name.toLowerCase().replace(/\s/g, '-')}`;

    const isInDedicatedChannel = message.channel.id === config.dedicated_channel_id;
    const isMentioned = message.mentions.has(message.client.user.id);

    // --- Determine if the agent should be triggered ---
    if (!isMentioned && !isInDedicatedChannel && !isPrivateMessageThread) {
        return;
    }
    
    const imageAttachment = message.attachments.find(att => imageMimeTypes.some(mime => att.contentType?.startsWith(mime)));
    if (!message.content && !imageAttachment) {
        return;
    }

    // --- Message Processing for AI ---
    let processedMessage = message.content;

    // Replace user mentions with their display names
    message.mentions.users.forEach(user => {
        const member = message.guild?.members.cache.get(user.id);
        const name = member ? member.displayName : user.username;
        processedMessage = processedMessage.replace(new RegExp(`<@!?${user.id}>`, 'g'), `@${name}`);
    });

    // Replace role mentions with role names
    message.mentions.roles.forEach(role => {
        processedMessage = processedMessage.replace(new RegExp(`<@&${role.id}>`, 'g'), `@${role.name}`);
    });
    
    const interactionContext = isPrivateMessageThread 
        ? 'Message Privé (simulé via fil)' 
        : isMentioned 
        ? 'Mention dans un groupe' 
        : 'Salon dédié actif';
    
    console.log(`[Agent] Received message from ${message.author.tag} in ${message.guild.name}. Trigger: ${interactionContext}`);

    try {
        await message.channel.sendTyping();

        let photoDataUri: string | undefined = undefined;
        if (imageAttachment) {
            try {
                photoDataUri = await imageUrlToDataUri(imageAttachment.url);
            } catch (imageError) {
                console.error('[Agent] Failed to process image attachment:', imageError);
            }
        }
        
        // --- Gather user context based on config ---
        const userSanctionHistory = config.data_sharing?.share_sanction_history ? getUserSanctionHistory(message.guild.id, message.author.id) : undefined;
        const userLevel = config.data_sharing?.share_level ? getUserLevel(message.author.id, message.guild.id) : undefined;
        const userRoles = config.data_sharing?.share_roles ? message.member.roles.cache.map(r => r.name).filter(n => n !== '@everyone') : undefined;

        let historyForPrompt: { user: string, content: string }[] = [];
        const historyKey = message.channel.id;
        const currentHistory = conversationHistory.get(historyKey) || [];
        historyForPrompt = [...currentHistory]; 

        currentHistory.push({ user: message.member.displayName, content: processedMessage });
        if (currentHistory.length > HISTORY_LIMIT) {
            currentHistory.shift();
        }
        conversationHistory.set(historyKey, currentHistory);

        const result = await conversationalAgentFlow({
            serverName: message.guild.name,
            userMessage: processedMessage,
            userName: message.member.displayName,
            userId: message.author.id,
            userRoles,
            userLevel,
            agentName: config.agent_name,
            agentRole: config.agent_role,
            agentPersonality: config.agent_personality,
            persona_prompt: config.human_mode_enabled ? config.persona_prompt : undefined,
            customPrompt: config.custom_prompt,
            knowledgeBase: config.human_mode_enabled ? undefined : config.knowledge_base,
            userSanctionHistory: userSanctionHistory,
            photoDataUri: photoDataUri,
            allow_imagination: config.allow_imagination,
            allow_freewheeling: config.allow_freewheeling,
            allow_image_generation: config.allow_image_generation,
            interactionContext: interactionContext,
            agent_actions: config.agent_actions,
        });

        // --- Execute Action if present ---
        if (result.action) {
            const targetUser = await message.client.users.fetch(result.action.userId).catch(() => null);
            if (targetUser) {
                switch(result.action.type) {
                    case 'send_dm':
                        if (config.agent_actions.can_send_dms && result.action.details.messageContent) {
                            try {
                                await targetUser.send(result.action.details.messageContent);
                                console.log(`[Agent Action] Sent DM to ${targetUser.tag}`);
                            } catch (e) {
                                console.error(`[Agent Action] Failed to send DM to ${targetUser.tag}`);
                            }
                        }
                        break;
                     // ... other actions can be implemented here in the future
                }
            }
        }

        // --- Send Response if present ---
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
                await message.channel.send({ content: result.response || undefined, files: files });
                
                const updatedHistory = conversationHistory.get(historyKey) || [];
                updatedHistory.push({ user: config.agent_name, content: result.response });
                if (updatedHistory.length > HISTORY_LIMIT) {
                    updatedHistory.shift();
                }
                conversationHistory.set(historyKey, updatedHistory);

                // If the answer was imagined, save it to the knowledge base (if not in human mode)
                if (result.imagined_answer && !config.human_mode_enabled) {
                    console.log('[Agent] Imagined answer detected. Creating new knowledge item...');
                    knowledgeCreationFlow({ userQuestion: processedMessage, agentResponse: result.response })
                        .then(newItem => {
                            addKnowledgeBaseItem(message.guild!.id, newItem);
                            console.log(`[Agent] New knowledge item created and saved for guild ${message.guild!.id}.`);
                        })
                        .catch(err => {
                            console.error('[Agent] Failed to create or save new knowledge item:', err);
                        });
                }
                // In human mode, trigger memory flow
                else if (config.human_mode_enabled) {
                     console.log(`[Agent Memory] Triggering memory creation for agent in ${message.guild.name}.`);
                    memoryFlow({
                        persona_id: message.guild.id, // Use guild ID as unique persona ID for the agent
                        conversationTranscript: updatedHistory.map(h => `${h.user}: ${h.content}`).join('\n')
                    }).catch(err => console.error(`[Agent Memory] Error creating memories:`, err));
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

    // The conversational agent logic is now self-contained and decides if it should trigger.
    await handleConversationalAgent(message);

    // Run other message-based scans like the FAQ scan.
    await handleFaqScan(message);
}
