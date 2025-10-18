
import { Events, MessageReaction, User, MessageType } from 'discord.js';
import { getServerConfig, updateUserXP } from '@/lib/db';
import { Collection } from 'discord.js';
import type { LevelingConfig } from '@/types';

const userCooldowns = new Collection<string, number>();

export const name = Events.MessageReactionAdd;

export async function execute(reaction: MessageReaction, user: User) {
    if (!reaction.message.guild || user.bot) return;

    const config = await getServerConfig(reaction.message.guild.id, 'leveling') as LevelingConfig | null;
    if (!config?.enabled) return;

    // Prevent users from gaining XP by reacting to their own messages
    if (reaction.message.author?.id === user.id) return;
    
    if (config.ignored_channels?.includes(reaction.message.channel.id)) {
        return;
    }

    const cooldownKey = `reaction-${reaction.message.guild.id}-${user.id}`;
    const now = Date.now();
    const cooldownTime = (config.cooldown_seconds || 60) * 1000;

    if (userCooldowns.has(cooldownKey)) {
        const expirationTime = userCooldowns.get(cooldownKey) as number;
        if (now < expirationTime) {
            return; // User is on cooldown
        }
    }
    
    let xpToGive = 0;
    const welcomeMessageTypes = [MessageType.UserJoin, MessageType.GuildBoost, MessageType.GuildBoostTier1, MessageType.GuildBoostTier2, MessageType.GuildBoostTier3];
    const isBotWelcome = reaction.message.author.bot && reaction.message.embeds.some(e => e.image?.url?.includes('/card/welcome/'));

    // Check if it's a reaction to a welcome message
    if (welcomeMessageTypes.includes(reaction.message.type) || isBotWelcome) {
        if (config.xp_per_welcome_reaction && config.xp_per_welcome_reaction > 0) {
            xpToGive = config.xp_per_welcome_reaction;
            console.log(`[XP] Giving ${xpToGive} XP to ${user.tag} for welcome reaction in ${reaction.message.guild.name}.`);
        }
    } else {
        // Standard reaction XP
        if (config.xp_per_reaction && config.xp_per_reaction > 0) {
             xpToGive = config.xp_per_reaction;
        }
    }

    if (xpToGive > 0) {
        userCooldowns.set(cooldownKey, now + cooldownTime);
        updateUserXP(user.id, reaction.message.guild.id, xpToGive);
    }
}
