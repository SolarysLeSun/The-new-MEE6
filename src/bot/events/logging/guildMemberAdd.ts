

import { Events, GuildMember, EmbedBuilder, TextChannel } from 'discord.js';
import { getServerConfig, getAndClearUserRoles } from '../../../src/lib/db';

export const name = Events.GuildMemberAdd;

export async function execute(member: GuildMember) {
    // --- Role Memory ---
    try {
        const roleMemoryConfig = await getServerConfig(member.guild.id, 'role-memory');
        if (roleMemoryConfig?.enabled && roleMemoryConfig.premium) {
            const roleIds = getAndClearUserRoles(member.guild.id, member.id);
            if (roleIds && roleIds.length > 0) {
                const rolesToRestore = roleIds.filter(id => member.guild.roles.cache.has(id));
                if (rolesToRestore.length > 0) {
                    await member.roles.add(rolesToRestore);
                    console.log(`[Role Memory] Restored ${rolesToRestore.length} roles for ${member.user.tag} in ${member.guild.name}.`);
                    
                    const logConfig = await getServerConfig(member.guild.id, 'logs');
                    if (logConfig?.enabled && logConfig.log_settings?.members?.enabled) {
                        const targetChannelId = logConfig.log_settings.members.channel_id || logConfig.main_channel_id;
                        if(targetChannelId) {
                            const logChannel = await member.guild.channels.fetch(targetChannelId).catch(() => null) as TextChannel;
                            if(logChannel) {
                                logChannel.send({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setColor(0x3498DB)
                                            .setDescription(`♻️ **${rolesToRestore.length}** rôles ont été restaurés pour ${member.toString()} lors de son retour.`)
                                    ]
                                });
                            }
                        }
                    }
                }
            }
        }
    } catch(e) {
        console.error(`[Role Memory] Error restoring roles for ${member.user.tag}:`, e);
    }


    // --- Join Log ---
    const config = await getServerConfig(member.guild.id, 'logs');
    if (!config?.enabled || !config.log_settings?.members?.enabled) return;
    
    // Check for exemptions
    if (member.roles.cache.some(r => config.exempt_roles?.includes(r.id))) return;

    const targetChannelId = config.log_settings.members.channel_id || config.main_channel_id;
    if (!targetChannelId) return;

    const logChannel = await member.guild.channels.fetch(targetChannelId).catch(() => null) as TextChannel;
    if (!logChannel) return;

    const accountAge = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;

    const embed = new EmbedBuilder()
        .setColor(0x57F287) // Discord Green
        .setAuthor({ name: 'Un membre a rejoint', iconURL: member.user.displayAvatarURL() })
        .setDescription(`${member.user} ${member.user.tag}`)
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
            { name: 'Compte créé', value: accountAge, inline: true },
            { name: 'Total Membres', value: member.guild.memberCount.toString(), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `ID: ${member.user.id}` });

    try {
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error(`[Log] Erreur lors de l'envoi du log d'arrivée de membre pour le serveur ${member.guild.id}:`, error);
    }
}
