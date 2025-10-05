
import { Events, GuildMember, PartialGuildMember } from 'discord.js';
import { getServerConfig, saveUserRoles } from '../../../src/lib/db';

export const name = Events.GuildMemberRemove;

export async function execute(member: GuildMember | PartialGuildMember) {
    if (member.user.bot) return;

    const config = await getServerConfig(member.guild.id, 'role-persistence');
    if (!config?.enabled || !config.premium) {
        return;
    }

    // If a required role is set, only save roles for members who have it.
    if (config.required_role_id && !member.roles.cache.has(config.required_role_id)) {
        return;
    }

    try {
        const roleIds = member.roles.cache
            .filter(role => !role.managed && role.name !== '@everyone')
            .map(role => role.id);
        
        if (roleIds.length > 0) {
            saveUserRoles(member.guild.id, member.id, roleIds);
            console.log(`[Role-Persistence] Saved ${roleIds.length} roles for departing member ${member.user.tag} from ${member.guild.name}.`);
        }

    } catch (error) {
        console.error(`[Role-Persistence] Error saving roles for ${member.user.tag}:`, error);
    }
}
