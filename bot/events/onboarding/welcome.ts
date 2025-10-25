
import { Events, GuildMember, TextChannel, EmbedBuilder } from 'discord.js';
import { getServerConfig } from '../../../src/lib/db';
import type { WelcomeConfig } from '@/types';

export const name = Events.GuildMemberAdd;

export async function execute(member: GuildMember) {
    if (member.user.bot) return;

    const config = await getServerConfig(member.guild.id, 'welcome-message') as WelcomeConfig | null;

    if (!config?.enabled) {
        return;
    }

    let channel: TextChannel | null = null;
    if (config.welcome_channel_id) {
        channel = await member.guild.channels.fetch(config.welcome_channel_id).catch(() => null) as TextChannel;
    }

    if (!channel && !config.send_in_dm) {
        return;
    }

    const welcomeText = config.welcome_message.replace('{user}', member.toString());

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
        
        const embed = new EmbedBuilder()
            .setColor(config.card_text_color ? parseInt(config.card_text_color.replace('#', ''), 16) : 0xf37349)
            .setImage(cardUrl.toString());

        if (channel) {
            await channel.send({ content: welcomeText, embeds: [embed] }).catch(console.error);
        }
        if (config.send_in_dm) {
            await member.send({ content: welcomeText, embeds: [embed] }).catch(() => console.log(`[Welcome] Impossible d'envoyer un DM de bienvenue à ${member.user.tag}.`));
        }

    } else {
        // Send text-only message
        if (channel) {
            await channel.send(welcomeText).catch(console.error);
        }
        if (config.send_in_dm) {
             await member.send(welcomeText).catch(() => console.log(`[Welcome] Impossible d'envoyer un DM de bienvenue à ${member.user.tag}.`));
        }
    }
}
