import { ChannelType, Collection, Events, Message } from 'discord.js';
import { getServerConfig, recordSanction } from '@/lib/db';
import type { AutoModRule } from '@/types';

// Collection to track user message timestamps for flood/spam detection
const userMessageTimestamps = new Collection<string, number[]>();

export const name = Events.MessageCreate;
export const once = false;

export async function execute(message: Message) {
    if (!message.guild || message.author.bot || !message.member) return;

    const config = await getServerConfig(message.guild.id, 'auto-moderation');
    if (!config?.enabled || !config.rules || config.rules.length === 0) {
        return;
    }

    const now = Date.now();
    const userKey = `${message.guild.id}-${message.author.id}`;
    const userMessages = userMessageTimestamps.get(userKey) || [];

    // Add current message timestamp and clean up old ones
    userMessages.push(now);
    const cleanedTimestamps = userMessages.filter(timestamp => (now - timestamp) < 60000); // Keep last minute
    userMessageTimestamps.set(userKey, cleanedTimestamps);

    for (const rule of config.rules as AutoModRule[]) {
        if (rule.exempt_channels.includes(message.channel.id) ||
            rule.exempt_roles.some(roleId => message.member?.roles.cache.has(roleId))) {
            continue;
        }

        let violationReason: string | null = null;
        let deleteMessage = false;

        switch (rule.type) {
            case 'keywords':
                if (rule.keywords?.some(keyword => message.content.toLowerCase().includes(keyword.toLowerCase()))) {
                    violationReason = `Utilisation du mot-clé interdit "${rule.name}"`;
                    deleteMessage = true;
                }
                break;
            
            case 'flood': {
                const timeframe = (rule.timeframe_seconds || 5) * 1000;
                const messageCount = rule.message_count || 5;
                const recentMessages = cleanedTimestamps.filter(timestamp => (now - timestamp) < timeframe);
                if (recentMessages.length >= messageCount) {
                    violationReason = `Flood de messages (${recentMessages.length} en moins de ${rule.timeframe_seconds}s)`;
                    deleteMessage = true;
                    // Clear timestamps to prevent repeated triggering for the same flood
                    userMessageTimestamps.set(userKey, []); 
                }
                break;
            }

            case 'caps': {
                const minLength = 15; // Don't check short messages
                if (message.content.length > minLength) {
                    const capsPercentage = (rule.caps_percentage || 70) / 100;
                    const upperCaseChars = (message.content.match(/[A-Z]/g) || []).length;
                    const letterChars = (message.content.match(/[a-zA-Z]/g) || []).length;
                    if (letterChars > 0 && (upperCaseChars / letterChars) > capsPercentage) {
                        violationReason = `Utilisation excessive de majuscules (${Math.round((upperCaseChars / letterChars) * 100)}%)`;
                        deleteMessage = true;
                    }
                }
                break;
            }

            case 'mentions': {
                const mentionLimit = rule.mention_limit || 5;
                const mentionCount = message.mentions.users.size + message.mentions.roles.size;
                if (mentionCount >= mentionLimit) {
                    violationReason = `Mention de masse (${mentionCount} mentions)`;
                    deleteMessage = true;
                }
                break;
            }

             case 'spam': {
                const timeframe = (rule.timeframe_seconds || 10) * 1000;
                const messageCount = rule.message_count || 3;
                const recentMessages = cleanedTimestamps.filter(timestamp => (now - timestamp) < timeframe);
                
                // Simple spam check: X identical messages in Y seconds
                const recentMessageContents = await message.channel.messages.fetch({ limit: 10, before: message.id });
                const userRecentMessages = recentMessageContents.filter(m => m.author.id === message.author.id && (now - m.createdTimestamp) < timeframe);
                
                if(userRecentMessages.size >= messageCount -1) {
                    const isSpam = userRecentMessages.every(m => m.content === message.content);
                    if(isSpam) {
                        violationReason = `Spam de messages identiques`;
                        deleteMessage = true;
                         userMessageTimestamps.set(userKey, []); 
                    }
                }
                break;
            }
        }

        if (violationReason) {
            if (deleteMessage) {
                try {
                    await message.delete();
                } catch (e) {
                    console.warn(`[AutoMod] Could not delete message ${message.id}:`, e);
                }
            }

            if (rule.action === 'warn') {
                recordSanction({
                    guild_id: message.guild.id,
                    user_id: message.author.id,
                    moderator_id: 'AUTOMOD',
                    action_type: 'warn',
                    reason: `[AutoMod] ${violationReason}`,
                });
                
                const warnMsg = await message.channel.send(`> ${message.author}, votre message a été supprimé. Raison : ${violationReason}`);
                setTimeout(() => warnMsg.delete().catch(console.error), 10000);
            }
            // Stop after first rule violation
            return; 
        }
    }
}