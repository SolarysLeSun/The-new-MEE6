

'use server';

import { Guild, User, TextChannel, EmbedBuilder } from 'discord.js';
import { getServerConfig, getUserLevel, getUserRank } from '@/lib/db';

export const name = 'levelUp';

export async function execute(user: User, guild: Guild, newLevel: number) {
    const config = await getServerConfig(guild.id, 'leveling');
    if (!config || !config.enabled) return;

    // --- Check frequency ---
    const frequency = config.level_up_frequency || 1;
    if (frequency > 0 && newLevel % frequency !== 0) {
        return;
    }

    // --- Send level up message ---
    if (config.level_up_channel_id) {
        const channel = await guild.channels.fetch(config.level_up_channel_id).catch(() => null) as TextChannel;
        if (channel && channel.isTextBased()) {
            
            const messageContent = (config.mention_user_on_levelup ?? true) 
                ? `Félicitations ${user.toString()}, vous avez atteint le niveau **${newLevel}** !`
                : `Félicitations ${user.username}, vous avez atteint le niveau **${newLevel}** !`;

            // --- Generate Card Embed ---
            const member = await guild.members.fetch(user.id).catch(() => null);
            if (!member) return;
            
            try {
                const rank = getUserRank(user.id, guild.id);

                const cardUrl = new URL(`${process.env.PANEL_BASE_URL}/card/levelup/${guild.id}/${user.id}`);
                cardUrl.searchParams.append('displayName', member.displayName);
                cardUrl.searchParams.append('avatarUrl', user.displayAvatarURL({ extension: 'png', size: 256 }));
                cardUrl.searchParams.append('level', newLevel.toString());
                cardUrl.searchParams.append('rank', rank.toString());
                if (config.level_card_background_url) {
                    cardUrl.searchParams.append('backgroundUrl', config.level_card_background_url);
                }
                if (config.level_card_bar_color) {
                    cardUrl.searchParams.append('barColor', config.level_card_bar_color);
                }
                if (config.level_card_text_color) {
                    cardUrl.searchParams.append('textColor', config.level_card_text_color);
                }

                const embed = new EmbedBuilder()
                    .setColor(config.level_card_bar_color ? parseInt(config.level_card_bar_color.replace('#', ''), 16) : 0x3498DB)
                    .setImage(cardUrl.toString());

                await channel.send({ content: messageContent, embeds: [embed] });

            } catch (error) {
                 console.error(`[LevelUp] Could not send level up card to ${channel.id} in ${guild.name}:`, error);
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
