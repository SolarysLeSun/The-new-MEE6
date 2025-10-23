

import { Events, Message, Collection, EmbedBuilder, TextChannel, AttachmentBuilder, User } from 'discord.js';
import { getServerConfig, addKnowledgeBaseItem, getUserSanctionHistory, getUserLevel, updateUserXP, recordSanction } from '../../../src/lib/db';
import { conversationalAgentFlow } from '../../../src/ai/flows/conversational-agent-flow';
import { knowledgeCreationFlow } from '../../../src/ai/flows/knowledge-creation-flow';
import { faqFlow } from '../../../src/ai/flows/faq-flow';
import { generateImage } from '../../../src/ai/flows/content-creation-flow';
import fetch from 'node-fetch';
import ms from 'ms';

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
    if (!config?.enabled || !config.premium) {
        return;
    }
    
    // Check for "MP" simulation via thread
    const isDMThread = message.channel.isThread() && message.channel.parent?.name.startsWith('mp-');

    const isInDedicatedChannel = message.channel.id === config.dedicated_channel_id;
    const isMentioned = message.mentions.has(message.client.user.id);

    // --- Determine if the agent should be triggered ---
    if (!isMentioned && !isInDedicatedChannel && !isDMThread) {
        return;
    }
    
    const imageAttachment = message.attachments.find(att => imageMimeTypes.some(mime => att.contentType?.startsWith(mime)));
    if ((isInDedicatedChannel || isDMThread) && !message.content && !imageAttachment && !isMentioned) {
        return;
    }

    // --- Message Processing for AI ---
    let processedMessage = message.content;
    message.mentions.users.forEach(user => {
        const member = message.guild?.members.cache.get(user.id);
        const name = member ? member.displayName : user.username;
        processedMessage = processedMessage.replace(new RegExp(`<@!?${user.id}>`, 'g'), `@${name}`);
    });
    message.mentions.roles.forEach(role => {
        processedMessage = processedMessage.replace(new RegExp(`<@&${role.id}>`, 'g'), `@${role.name}`);
    });
    
    let interactionContext = 'Unknown';
    if(isDMThread) interactionContext = "Message Privé (simulé via fil)";
    else if (isMentioned) interactionContext = 'Mention dans un groupe';
    else if (isInDedicatedChannel) interactionContext = 'Salon dédié actif';
    
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
        
        const userSanctionHistory = config.data_sharing?.share_sanction_history ? getUserSanctionHistory(message.guild.id, message.author.id) : undefined;
        const userLevel = config.data_sharing?.share_level ? getUserLevel(message.author.id, message.guild.id) : undefined;
        const userRoles = config.data_sharing?.share_roles ? message.member.roles.cache.map(r => r.name).filter(n => n !== '@everyone') : undefined;

        let historyForPrompt: { user: string, content: string }[] = [];
        if (isInDedicatedChannel || isDMThread) {
            const currentHistory = conversationHistory.get(message.channel.id) || [];
            historyForPrompt = [...currentHistory]; 

            currentHistory.push({ user: message.member.displayName, content: processedMessage });
            if (currentHistory.length > HISTORY_LIMIT) {
                currentHistory.shift();
            }
            conversationHistory.set(message.channel.id, currentHistory);
        } else {
             const lastMessages = await message.channel.messages.fetch({ limit: 5, before: message.id });
             historyForPrompt = lastMessages.map(m => ({ user: m.author.username, content: m.content })).reverse();
        }

        let result = await conversationalAgentFlow({
            serverName: message.guild.name,
            userMessage: processedMessage,
            userName: message.member.displayName,
            userId: message.author.id,
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
            interactionContext: interactionContext,
            agent_actions: {
                can_give_xp: config.agent_actions?.can_give_xp ?? false,
                can_apply_sanctions: config.agent_actions?.can_apply_sanctions ?? false,
            }
        });

        // --- Execute Actions from Response ---
        let responseText = result.response;
        const xpRegex = /--addxp\s+(\d+)\s+<@!?(\d+)>/;
        const sanctionRegex = /--sanction\s+(warn|mute)\s+<@!?(\d+)>\s+(.+)/;

        const xpMatch = responseText.match(xpRegex);
        const sanctionMatch = responseText.match(sanctionRegex);

        if (xpMatch && config.agent_actions?.can_give_xp) {
            const amount = parseInt(xpMatch[1], 10);
            const targetId = xpMatch[2];
            // For safety, only allow giving XP to the user who triggered the message or is mentioned
            const mentionedUsers = Array.from(message.mentions.users.values()).map(u => u.id);
            if (targetId === message.author.id || mentionedUsers.includes(targetId)) { 
                updateUserXP(targetId, message.guild.id, amount, 'add');
                console.log(`[Agent Action] Gave ${amount} XP to user ${targetId}.`);
                responseText = responseText.replace(xpRegex, '').trim(); // Clean the command from the response
            }
        }

        if (sanctionMatch && config.agent_actions?.can_apply_sanctions) {
            const action = sanctionMatch[1];
            const targetId = sanctionMatch[2];
            const reason = sanctionMatch[3];
            const targetMember = await message.guild.members.fetch(targetId).catch(() => null);

            if (targetMember) {
                if (action === 'warn') {
                    recordSanction({
                        guild_id: message.guild.id,
                        user_id: targetMember.id,
                        moderator_id: message.client.user.id,
                        action_type: 'warn',
                        reason: `[IA] ${reason}`
                    });
                     console.log(`[Agent Action] Warned user ${targetMember.id} for: ${reason}`);
                } else if (action === 'mute') {
                    const duration = ms(reason) || ms('10m'); // Default to 10m if duration is not parsable
                     if (targetMember.moderatable) {
                        await targetMember.timeout(duration, `[IA] ${reason}`);
                        console.log(`[Agent Action] Muted user ${targetMember.id} for ${duration}ms. Reason: ${reason}`);
                     }
                }
                responseText = responseText.replace(sanctionRegex, '').trim(); // Clean the command
            }
        }


        // The AI can choose not to respond by returning an empty string
        if (!responseText && !result.image_prompt) {
            console.log(`[Agent] Agent chose not to respond to the message in ${interactionContext}.`);
            return;
        }
        
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
            if(responseText || files.length > 0) {
                 await message.channel.send({ content: responseText || undefined, files: files });
            }
            
            if (isInDedicatedChannel || isDMThread) {
                const currentHistory = conversationHistory.get(message.channel.id) || [];
                currentHistory.push({ user: config.agent_name, content: responseText });
                if (currentHistory.length > HISTORY_LIMIT) {
                    currentHistory.shift();
                }
                conversationHistory.set(message.channel.id, currentHistory);
            }

            if (result.imagined_answer) {
                console.log('[Agent] Imagined answer detected. Creating new knowledge item...');
                knowledgeCreationFlow({ userQuestion: processedMessage, agentResponse: responseText })
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
            } else if (replyError.code === 50006) { // Cannot send an empty message
                console.warn(`[Agent] Agent tried to send an empty message and it was blocked.`);
            }
            else {
                throw replyError;
            }
        }

    } catch (error: any) {
        console.error('[Agent] Error during conversational agent flow:', error);
        // Do not send an error message to the channel to avoid spam
    }
}


export const name = Events.MessageCreate;
export const once = false;
export async function execute(message: Message) {
    if (message.author.bot || !message.guild) return;
    await handleConversationalAgent(message);
    await handleFaqScan(message);
}
