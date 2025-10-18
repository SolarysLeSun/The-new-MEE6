
import { Events, Message } from 'discord.js';
import { getServerConfig } from '../../../src/lib/db';

const tenorRegex = /https?:\/\/tenor\.com\/view\/[^\s]+/i;

export const name = Events.MessageCreate;
export const once = false;

export async function execute(message: Message) {
    if (!message.guild || message.author.bot || !message.member) return;

    const config = await getServerConfig(message.guild.id, 'gif-filter');
    if (!config?.enabled) {
        return;
    }

    const hasTenorLink = tenorRegex.test(message.content);
    if (!hasTenorLink) {
        return;
    }

    // Check for exempt roles
    const exemptRoles = config.exempt_roles || [];
    if (message.member.roles.cache.some(role => exemptRoles.includes(role.id))) {
        return;
    }

    // Check for exempt channels
    const exemptChannels = config.exempt_channels || [];
    if (exemptChannels.includes(message.channel.id)) {
        return;
    }

    console.log(`[GIF-Filter] Deleting GIF from ${message.author.tag} in ${message.guild.name}.`);

    try {
        await message.delete();
        const replyMsg = await message.channel.send(`> ${message.author.toString()}, les GIFs ne sont pas autorisés dans ce salon.`);
        setTimeout(() => replyMsg.delete().catch(() => {}), 5000);
    } catch (error: any) {
        if (error.code !== 10008) { // Ignore "Unknown Message" error if it was already deleted
            console.error(`[GIF-Filter] Failed to delete message ${message.id}:`, error);
        }
    }
}
