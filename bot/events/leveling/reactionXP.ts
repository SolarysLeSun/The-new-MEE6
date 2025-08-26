

import { Events, MessageReaction, User } from 'discord.js';
import { getServerConfig, updateUserXP } from '@/lib/db';
import { Collection } from 'discord.js';
import { handleLevelUp } from './levelUp';

const userCooldowns = new Collection<string, number>();

export const name = Events.MessageReactionAdd;

export async function execute(reaction: MessageReaction, user: User) {
    if (!reaction.message.guild || user.bot) return;

    const config = await getServerConfig(reaction.message.guild.id, 'leveling');
    if (!config?.enabled || !config.xp_per_reaction || config.xp_per_reaction <= 0) return;

    // Prevent users from gaining XP by reacting to their own messages
    if (reaction.message.author?.id === user.id) return;

    const cooldownKey = `reaction-${reaction.message.guild.id}-${user.id}`;
    const now = Date.now();
    const cooldownTime = (config.cooldown_seconds || 60) * 1000;

    if (userCooldowns.has(cooldownKey)) {
        const expirationTime = userCooldowns.get(cooldownKey) as number;
        if (now < expirationTime) {
            return; // User is on cooldown
        }
    }

    userCooldowns.set(cooldownKey, now + cooldownTime);

    const { leveledUp, newLevel } = updateUserXP(user.id, reaction.message.guild.id, config.xp_per_reaction);

    if(leveledUp && newLevel > 0) {
        const member = await reaction.message.guild.members.fetch(user.id);
        await handleLevelUp(member.user, reaction.message.guild, newLevel);
    }
}
