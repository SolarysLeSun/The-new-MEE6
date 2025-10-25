
import { Events, Guild, User, TextChannel, EmbedBuilder } from 'discord.js';
import { getServerConfig } from '@/lib/db';
import type { Ticket } from '@/types';

async function handleTicketLog(guild: Guild, title: string, ticket: Ticket, actor: User, details: { name: string, value: string }[]) {
    const config = await getServerConfig(guild.id, 'logs');
    if (!config?.enabled || !config.log_settings?.moderation?.enabled) return;

    const targetChannelId = config.log_settings.moderation.channel_id || config.main_channel_id;
    if (!targetChannelId) return;

    const logChannel = await guild.channels.fetch(targetChannelId).catch(() => null) as TextChannel;
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setColor(0x8E44AD) // Purple
        .setTitle(`Log Ticket : ${title}`)
        .addFields(
            { name: 'Ticket', value: `<#${ticket.channel_id}>`, inline: true },
            { name: 'Auteur du Ticket', value: `<@${ticket.owner_id}>`, inline: true },
            { name: 'Action par', value: actor.toString(), inline: true },
            ...details
        )
        .setTimestamp();
    
    try {
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error(`[Log] Erreur lors de l'envoi du log de ticket pour le serveur ${guild.id}:`, error);
    }
}


export const name = 'ticketActivity';

export async function execute(action: 'create' | 'statusUpdate' | 'memberUpdate', ticket: Ticket, actor: User, details: any) {
    if (!clientInstance) return;
    const guild = await clientInstance.guilds.fetch(ticket.guild_id);
    if (!guild) return;

    switch (action) {
        case 'create':
            await handleTicketLog(guild, 'Création', ticket, actor, [
                { name: 'Données du Formulaire', value: '```json\n' + JSON.stringify(ticket.form_data, null, 2) + '\n```' }
            ]);
            break;
        case 'statusUpdate':
            await handleTicketLog(guild, 'Changement de Statut', ticket, actor, [
                { name: 'Nouveau Statut', value: details.status }
            ]);
            break;
        case 'memberUpdate':
             await handleTicketLog(guild, 'Gestion des Membres', ticket, actor, [
                { name: 'Action', value: details.action.charAt(0).toUpperCase() + details.action.slice(1) },
                { name: 'Utilisateur', value: details.targetUser.toString() }
            ]);
            break;
    }
}
