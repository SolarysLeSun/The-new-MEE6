
import { Events, Message } from 'discord.js';
import { getServerConfig } from '@/lib/db';

export const name = Events.MessageCreate;

export async function execute(message: Message) {
    if (!message.guild || message.author.bot) return;

    const config = await getServerConfig(message.guild.id, 'fun-commands');
    if (!config?.enabled) {
        return;
    }

    try {
        if (config.gaypride_enabled) {
            await message.react('🏳️‍🌈');
        }
        if (config.oktban_enabled) {
            await message.react('1421563278039056528');
        }
        if (config.poutine_enabled) {
            await message.react('1430663147294953472');
        }
    } catch (error) {
        // Ignore errors if the bot can't react (e.g., permissions, emoji not found)
        // console.warn(`[ReactionModes] Could not react to message ${message.id}:`, error);
    }
}
