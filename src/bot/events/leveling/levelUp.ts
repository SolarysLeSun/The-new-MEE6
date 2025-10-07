

'use server';

import { Guild, User, TextChannel } from 'discord.js';
import { getServerConfig } from '@/lib/db';

export const name = 'levelUp';

export async function execute(user: User, guild: Guild, newLevel: number) {
    const config = await getServerConfig(guild.id, 'leveling');
    if (!config || !config.enabled) return;

    // --- Check frequency ---
    const frequency = config.level_up_frequency || 1;
    if (frequency === 0 || (newLevel % frequency !== 0)) {
        return;
    }

    // --- Send level up message ---
    if (config.level_up_channel_id && config.level_up_message) {
        const channel = await guild.channels.fetch(config.level_up_channel_id).catch(() => null) as TextChannel;
        if (channel && channel.isTextBased()) {
            const userDisplay = (config.mention_user_on_levelup ?? true) ? user.toString() : user.username;
            const message = config.level_up_message
                .replace('{user}', userDisplay)
                .replace('{username}', user.username) // Also support {username} for non-mention cases
                .replace('{level}', newLevel.toString());
            try {
                await channel.send(message);
            } catch (error) {
                console.error(`[LevelUp] Could not send level up message to ${channel.id} in ${guild.name}`);
            }
        }
    }

    // --- Assign role rewards ---
    const roleReward = config.role_rewards?.find((rr: any) => rr.level === newLevel);
    if (roleReward && roleReward.role_id) {
        try {
            const role = await guild.roles.fetch(roleReward.role_id);
            const member = await guild.members.fetch(user.id);
            if (role && member) {
                // Check role hierarchy
                if (guild.members.me && role.position >= guild.members.me.roles.highest.position) {
                     console.warn(`[LevelUp] Cannot assign role "${role.name}" to ${user.tag} because it is higher than or equal to the bot's highest role.`);
                } else {
                    await member.roles.add(role);
                    console.log(`[LevelUp] Assigned role ${role.name} to ${user.tag} for reaching level ${newLevel}.`);
                }
            }
        } catch (error) {
            console.error(`[LevelUp] Could not assign role reward for level ${newLevel} to ${user.tag}:`, error);
        }
    }
}
