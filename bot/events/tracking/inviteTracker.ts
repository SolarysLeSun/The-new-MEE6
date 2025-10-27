
import { Events, GuildMember, EmbedBuilder, TextChannel, Invite, Collection } from 'discord.js';
import { getServerConfig } from '@/lib/db';

export const name = Events.GuildMemberAdd;

export async function execute(member: GuildMember) {
    const config = await getServerConfig(member.guild.id, 'invitations');
    if (!config?.enabled || !config.log_channel_id) return;

    try {
        // Fetch current invites
        const newInvites = await member.guild.invites.fetch();
        // Get cached invites
        const oldInvites = member.client.invites.get(member.guild.id) as Collection<string, Invite>;

        // Find the invite that was used
        const invite = newInvites.find(i => (i.uses || 0) > (oldInvites.get(i.code)?.uses || 0));

        // Update cache
        member.client.invites.set(member.guild.id, newInvites);

        const logChannel = await member.guild.channels.fetch(config.log_channel_id).catch(() => null) as TextChannel;
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0x57F287) // Green
            .setAuthor({ name: 'Nouveau Membre via Invitation', iconURL: member.user.displayAvatarURL() })
            .setDescription(`${member.toString()} a rejoint le serveur.`);
        
        if (invite && invite.inviter) {
            embed.addFields(
                { name: 'Invité par', value: `${invite.inviter.tag} (${invite.inviter.id})`, inline: true },
                { name: 'Code d\'invitation', value: `\`${invite.code}\``, inline: true },
                { name: 'Utilisations du code', value: `${invite.uses}`, inline: true }
            );
        } else {
            embed.addFields({ name: 'Invitation', value: "Impossible de déterminer l'invitation (lien personnalisé ou temporaire expiré).", inline: false });
        }

        embed.setTimestamp().setFooter({ text: `ID: ${member.id}` });
        
        await logChannel.send({ embeds: [embed] });

    } catch (error) {
        console.error(`[InviteTracker] Erreur pour le serveur ${member.guild.id}:`, error);
    }
}
