

import { Events, GuildMember, EmbedBuilder, TextChannel, AuditLogEvent, User } from 'discord.js';
import { getServerConfig, saveUserRoles } from '../../../src/lib/db';

export const name = Events.GuildMemberRemove;

export async function execute(member: GuildMember) {
    if (member.partial) {
        try {
            await member.fetch();
        } catch (error) {
            console.error("Failed to fetch partial member:", error);
            return;
        }
    }
    
    // --- Role Memory ---
    try {
        const roleMemoryConfig = await getServerConfig(member.guild.id, 'role-memory');
        if (roleMemoryConfig?.enabled && roleMemoryConfig.premium) {
            const triggerRoles = roleMemoryConfig.trigger_roles || [];
            const hasTriggerRole = member.roles.cache.some(role => triggerRoles.includes(role.id));
            
            if (triggerRoles.length === 0 || hasTriggerRole) {
                const rolesToSave = member.roles.cache
                    .filter(role => role.id !== member.guild.id) // Exclude @everyone
                    .map(role => role.id);

                if (rolesToSave.length > 0) {
                    saveUserRoles(member.guild.id, member.id, rolesToSave);
                    console.log(`[Role Memory] Saved ${rolesToSave.length} roles for ${member.user.tag} from ${member.guild.name}.`);
                }
            }
        }
    } catch (e) {
        console.error(`[Role Memory] Error saving roles for ${member.user.tag}:`, e);
    }

    // --- Leave Log ---
    const config = await getServerConfig(member.guild.id, 'logs');
    if (!config?.enabled || !config.log_settings?.members?.enabled) return;

    const targetChannelId = config.log_settings.members.channel_id || config.main_channel_id;
    if (!targetChannelId) return;

    const logChannel = await member.guild.channels.fetch(targetChannelId).catch(() => null) as TextChannel;
    if (!logChannel) return;

    const roles = member.roles.cache
        .filter(r => r.name !== '@everyone')
        .map(r => r.toString())
        .join(', ');

    const embed = new EmbedBuilder()
        .setColor(0xED4245) // Discord Red
        .setAuthor({ name: 'Un membre a quitté', iconURL: member.user.displayAvatarURL() })
        .setDescription(`${member.user} ${member.user.tag}`)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `ID: ${member.user.id}` });

    if (roles) {
        embed.addFields({ name: 'Rôles', value: roles });
    }

    // Check for kick/ban logs
    try {
        const fetchedLogs = await member.guild.fetchAuditLogs({
            limit: 1,
        });
        const log = fetchedLogs.entries.first();

        if (log) {
            let action: string | null = null;
            if (log.action === AuditLogEvent.MemberKick && (log.target as User).id === member.id) {
                action = 'expulsé';
            } else if (log.action === AuditLogEvent.MemberBanAdd && (log.target as User).id === member.id) {
                action = 'banni';
            }

            if (action) {
                 embed.setAuthor({ name: `Un membre a été ${action}`, iconURL: member.user.displayAvatarURL() });
                 embed.addFields({ name: `Auteur de l'action`, value: log.executor?.toString() || 'Inconnu', inline: true });
                 if(log.reason) embed.addFields({ name: `Raison`, value: log.reason, inline: true });
            }
        }
    } catch(e) {
        console.warn(`[Log] Missing permissions to fetch audit logs on ${member.guild.name}`);
    }


    try {
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error(`[Log] Erreur lors de l'envoi du log de départ de membre pour le serveur ${member.guild.id}:`, error);
    }
}
