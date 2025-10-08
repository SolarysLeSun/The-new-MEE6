
'use server';

import { Events, Message } from 'discord.js';
import { getServerConfig, recordSanction } from '@/lib/db';

// Simple function to create a regex from keywords
function createKeywordRegex(keywords: string[]): RegExp | null {
    if (keywords.length === 0) return null;
    // Word boundaries (\b) prevent matching parts of words.
    // The 'i' flag makes it case-insensitive.
    const pattern = keywords.map(k => `\\b${k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`).join('|');
    return new RegExp(pattern, 'i');
}

export const name = Events.MessageCreate;

export async function execute(message: Message) {
    if (!message.guild || message.author.bot || !message.member) return;

    const config = await getServerConfig(message.guild.id, 'auto-moderation');
    if (!config?.enabled || !config.rules || config.rules.length === 0) {
        return;
    }

    for (const rule of config.rules) {
        // Check for exemptions
        if (rule.exempt_channels?.includes(message.channel.id)) continue;
        if (message.member.roles.cache.some(role => rule.exempt_roles?.includes(role.id))) continue;

        const keywordRegex = createKeywordRegex(rule.keywords || []);
        if (keywordRegex && keywordRegex.test(message.content)) {
            console.log(`[AutoMod] Matched rule "${rule.name}" for message from ${message.author.tag} in ${message.guild.name}.`);

            // Take action
            try {
                // Delete the message
                await message.delete();
                
                // Record the sanction
                recordSanction({
                    guild_id: message.guild.id,
                    user_id: message.author.id,
                    moderator_id: 'AUTOMOD',
                    action_type: 'warn',
                    reason: `Auto-modération: Règle "${rule.name}"`
                });

                // Send a temporary warning message
                const warningMessage = await message.channel.send(`> ${message.author}, votre message a été supprimé car il a enfreint la règle d'auto-modération **"${rule.name}"**.`);
                setTimeout(() => warningMessage.delete().catch(console.error), 10000);

            } catch (error) {
                console.error(`[AutoMod] Failed to take action for rule "${rule.name}":`, error);
            }

            // Stop after the first matching rule
            return; 
        }
    }
}
