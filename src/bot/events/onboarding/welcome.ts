
import { Events, GuildMember, TextChannel, EmbedBuilder } from 'discord.js';
import { getServerConfig } from '../../../src/lib/db';

export const name = Events.GuildMemberAdd;

export async function execute(member: GuildMember) {
    if (member.user.bot) return;

    const config = await getServerConfig(member.guild.id, 'welcome-message');

    if (!config?.enabled) {
        return;
    }

    const messageContent = (config.welcome_message || 'Bienvenue sur le serveur, {user} !')
        .replace('{user}', member.toString())
        .replace('{username}', member.user.username);
    
    let embed;
    if (config.use_card) {
        const cardUrl = new URL(`${process.env.PANEL_BASE_URL}/card/welcome/${member.guild.id}/${member.id}`);
        cardUrl.searchParams.append('displayName', member.displayName);
        cardUrl.searchParams.append('username', member.user.username);
        cardUrl.searchParams.append('avatarUrl', member.user.displayAvatarURL({ extension: 'png', size: 256 }));
        cardUrl.searchParams.append('serverName', member.guild.name);
        cardUrl.searchParams.append('memberCount', member.guild.memberCount.toString());
        cardUrl.searchParams.append('welcomeText', config.welcome_message);
        if (config.card_background_url) {
            cardUrl.searchParams.append('backgroundUrl', config.card_background_url);
        }
        if (config.card_text_color) {
            cardUrl.searchParams.append('textColor', config.card_text_color);
        }

        embed = new EmbedBuilder()
            .setColor(config.card_text_color ? parseInt(config.card_text_color.replace('#', ''), 16) : 0x3498DB)
            .setImage(cardUrl.toString())
            .setDescription(messageContent);
            
    } else {
        embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setDescription(messageContent);
    }
    
    // Send to guild channel
    if (config.welcome_channel_id) {
        const channel = await member.guild.channels.fetch(config.welcome_channel_id).catch(() => null) as TextChannel;
        if (channel) {
            try {
                await channel.send({ embeds: [embed] });
            } catch (error) {
                console.error(`[Welcome] Failed to send welcome message to channel ${channel.id}:`, error);
            }
        }
    }

    // Send to DM
    if (config.send_in_dm) {
        try {
            await member.send({ embeds: [embed] });
        } catch (error) {
            console.warn(`[Welcome] Failed to send welcome DM to ${member.user.tag}.`);
        }
    }
}
