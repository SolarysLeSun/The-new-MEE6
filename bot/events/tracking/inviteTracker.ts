

import { Events, GuildMember, EmbedBuilder, TextChannel, Invite, Collection, Role } from 'discord.js';
import { getServerConfig, incrementInviterCount } from '@/lib/db';
import type { InvitationReward } from '@/types';

export const name = Events.GuildMemberAdd;

export async function execute(member: GuildMember) {
    const config = await getServerConfig(member.guild.id, 'invitations');
    if (!config?.enabled) return;

    try {
        // Fetch current invites
        const newInvites = await member.guild.invites.fetch();
        // Get cached invites
        const oldInvites = member.client.invites.get(member.guild.id) as Collection<string, Invite>;

        // Find the invite that was used
        const invite = newInvites.find(i => (i.uses || 0) > (oldInvites.get(i.code)?.uses || 0));

        // Update cache
        member.client.invites.set(member.guild.id, newInvites);
        
        let inviter = invite?.inviter;

        // --- Log the invitation ---
        if (config.log_channel_id) {
            const logChannel = await member.guild.channels.fetch(config.log_channel_id).catch(() => null) as TextChannel;
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor(0x57F287) // Green
                    .setAuthor({ name: 'Nouveau Membre via Invitation', iconURL: member.user.displayAvatarURL() })
                    .setDescription(`${member.toString()} a rejoint le serveur.`);
                
                if (inviter) {
                    embed.addFields(
                        { name: 'Invité par', value: `${inviter.tag} (${inviter.id})`, inline: true },
                        { name: 'Code d\'invitation', value: `\`${invite?.code}\``, inline: true },
                        { name: 'Utilisations du code', value: `${invite?.uses}`, inline: true }
                    );
                } else {
                    embed.addFields({ name: 'Invitation', value: "Impossible de déterminer l'invitation (lien personnalisé ou temporaire expiré).", inline: false });
                }

                embed.setTimestamp().setFooter({ text: `ID: ${member.id}` });
                
                await logChannel.send({ embeds: [embed] });
            }
        }
        
        // --- Handle Reward Roles ---
        if (inviter && config.reward_roles && config.reward_roles.length > 0) {
            const inviteCount = incrementInviterCount(member.guild.id, inviter.id);
            const reward = config.reward_roles.find((r: InvitationReward) => r.invite_count === inviteCount);

            if (reward && reward.role_id) {
                try {
                    const inviterMember = await member.guild.members.fetch(inviter.id);
                    const roleToGive = await member.guild.roles.fetch(reward.role_id);
                    if (inviterMember && roleToGive) {
                        await inviterMember.roles.add(roleToGive, `Récompense pour ${inviteCount} invitations.`);
                        
                        // Notify the inviter
                        try {
                            await inviterMember.send(`🎉 Félicitations ! Grâce à votre invitation sur le serveur **${member.guild.name}**, vous avez atteint le palier de **${inviteCount} invitations** et reçu le rôle **@${roleToGive.name}** !`);
                        } catch (dmError) {
                            console.warn(`[InviteTracker] Could not DM user ${inviter.tag} about their reward.`);
                        }
                    }
                } catch (roleError) {
                    console.error(`[InviteTracker] Could not grant reward role ${reward.role_id} to ${inviter.tag}:`, roleError);
                }
            }
        }


    } catch (error) {
        console.error(`[InviteTracker] Erreur pour le serveur ${member.guild.id}:`, error);
    }
}
