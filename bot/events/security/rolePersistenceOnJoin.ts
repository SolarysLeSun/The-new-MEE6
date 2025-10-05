
import { Events, GuildMember } from 'discord.js';
import { getServerConfig, getAndClearSavedRoles } from '../../../src/lib/db';

export const name = Events.GuildMemberAdd;

export async function execute(member: GuildMember) {
    if (member.user.bot) return;

    const config = await getServerConfig(member.guild.id, 'role-persistence');
    if (!config?.enabled || !config.premium) {
        return;
    }

    try {
        const roleIds = getAndClearSavedRoles(member.guild.id, member.id);
        if (!roleIds || roleIds.length === 0) {
            return;
        }

        const botMember = await member.guild.members.fetch(member.client.user.id);
        const botHighestRolePosition = botMember.roles.highest.position;

        const rolesToAdd = roleIds.filter(roleId => {
            const role = member.guild.roles.cache.get(roleId);
            if (!role) return false;
            if (role.managed) return false; // Ne pas réassigner les rôles gérés par des intégrations
            if (role.position >= botHighestRolePosition) {
                 console.warn(`[Role-Persistence] Cannot re-assign role "${role.name}" to ${member.user.tag} because it is higher than the bot's role.`);
                 return false;
            }
            return true;
        });

        if (rolesToAdd.length > 0) {
            await member.roles.add(rolesToAdd);
            console.log(`[Role-Persistence] Restored ${rolesToAdd.length} roles for returning member ${member.user.tag} in ${member.guild.name}.`);
        }

    } catch (error) {
        console.error(`[Role-Persistence] Error restoring roles for ${member.user.tag}:`, error);
    }
}
