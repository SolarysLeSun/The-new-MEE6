

'use server';

import { Client, ChannelType, OverwriteResolvable, GuildChannel } from 'discord.js';
import { getServerConfig } from '@/lib/db';

const INTERVAL = 5 * 60 * 1000; // 5 minutes

// Map to store the IDs of the managed stat channels for each guild
const managedChannels = new Map<string, string>();

async function updateStats(client: Client) {
    for (const guild of client.guilds.cache.values()) {
        try {
            const config = await getServerConfig(guild.id, 'stats-channels');
            if (!config?.enabled || !config.category_id || !config.channel_format) {
                continue;
            }
            
            // Fetch fresh data
            await guild.members.fetch(); 
            const memberCount = guild.memberCount;
            const boostCount = guild.premiumSubscriptionCount || 0;
            const voiceCount = guild.voiceStates.cache.size;

            let channelName = config.channel_format
                .replace('{membres}', memberCount.toString())
                .replace('{boosts}', boostCount.toString())
                .replace('{en_vocal}', voiceCount.toString());

            let channelId = managedChannels.get(guild.id);
            let channel: GuildChannel | undefined;

            if (channelId) {
                channel = await guild.channels.fetch(channelId).catch(() => undefined) as GuildChannel;
            }

            if (!channel) {
                // Channel doesn't exist or ID is not cached, try to find it by a template name part
                const baseName = config.channel_format.split('{')[0] || '📊';
                channel = guild.channels.cache.find(c => c.parentId === config.category_id && c.name.startsWith(baseName)) as GuildChannel;
                
                // If still not found, create it
                if (!channel) {
                    console.log(`[Stats-Channels] Creating stats channel in ${guild.name}`);
                    const newChannel = await guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildVoice,
                        parent: config.category_id,
                        permissionOverwrites: [
                            {
                                id: guild.id, // @everyone
                                deny: ['Connect'],
                            },
                        ],
                        reason: "Canal de statistiques du bot Marcus"
                    });
                    managedChannels.set(guild.id, newChannel.id);
                    continue; // Skip rename on first creation
                } else {
                    // Found an existing channel, cache its ID
                    managedChannels.set(guild.id, channel.id);
                }
            }

            // If the name needs updating, update it
            if (channel.name !== channelName) {
                await channel.setName(channelName, "Mise à jour des statistiques");
            }
            
        } catch (error) {
            console.error(`[Stats-Channels] Failed to update stats for guild ${guild.id}:`, error);
        }
    }
}


export function startStatsChannelInterval(client: Client) {
    console.log('[+] Stats Channel Interval started.');
    // Initial run after a short delay
    setTimeout(() => updateStats(client), 10000); 
    // Set interval for periodic updates
    setInterval(() => updateStats(client), INTERVAL);
}
