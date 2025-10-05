
import { Events, Message, Collection } from 'discord.js';
import { getServerConfig, updateAffinityScore } from '@/lib/db';

const userCooldowns = new Collection<string, number>();

export const name = Events.MessageCreate;

export async function execute(message: Message) {
    if (!message.guild || message.author.bot || !message.mentions.members) return;

    const config = await getServerConfig(message.guild.id, 'affinites');
    if (!config?.enabled) return;

    const now = Date.now();
    const cooldown = 60 * 1000; // 1 minute cooldown to prevent spam

    // --- Points for mentioning someone ---
    if (message.mentions.members.size > 0) {
        for (const mentionedMember of message.mentions.members.values()) {
            if (mentionedMember.id === message.author.id || mentionedMember.user.bot) continue;

            const cooldownKey = `mention-${message.author.id}-${mentionedMember.id}`;
            if (userCooldowns.has(cooldownKey) && now < userCooldowns.get(cooldownKey)!) {
                continue; // Cooldown active for this pair
            }

            updateAffinityScore(message.guild.id, message.author.id, mentionedMember.id, config.points_per_mention);
            userCooldowns.set(cooldownKey, now + cooldown);
        }
    }

    // --- Points for talking in the same channel ---
    const lastMessage = await message.channel.messages.fetch({ limit: 2 }).then(msgs => msgs.last());
    if (lastMessage && !lastMessage.author.bot && lastMessage.author.id !== message.author.id) {
         const cooldownKey = `message-${[message.author.id, lastMessage.author.id].sort().join('-')}`;
         if (userCooldowns.has(cooldownKey) && now < userCooldowns.get(cooldownKey)!) {
             return;
         }

         updateAffinityScore(message.guild.id, message.author.id, lastMessage.author.id, config.points_per_message);
         userCooldowns.set(cooldownKey, now + cooldown);
    }
}
