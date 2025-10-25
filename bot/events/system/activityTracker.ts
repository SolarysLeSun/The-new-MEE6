

import { Client, Collection } from 'discord.js';
import { getAllBotServers, recordActivityStat, getServerConfig } from '@/lib/db';

const INTERVAL = 30 * 60 * 1000; // 30 minutes
const messageCounts = new Collection<string, number>();

export function trackMessage(guildId: string) {
    const currentCount = messageCounts.get(guildId) || 0;
    messageCounts.set(guildId, currentCount + 1);
}

export function startActivityTracker(client: Client) {
    // Listen for messages to increment the counter
    client.on('messageCreate', (message) => {
        if (message.guild) {
            trackMessage(message.guild.id);
        }
    });

    // Set an interval to record and reset the stats
    setInterval(async () => {
        console.log('[Activity-Tracker] Recording activity stats...');
        const guilds = await client.guilds.fetch();

        for (const oauthGuild of guilds.values()) {
            const guild = await oauthGuild.fetch();
            const config = getServerConfig(guild.id, 'community-analysis');
            if (!config?.enabled || !config.premium) {
                continue;
            }

            const messageCount = messageCounts.get(guild.id) || 0;
            const voiceMemberCount = guild.voiceStates.cache.size;

            recordActivityStat(guild.id, messageCount, voiceMemberCount);
            
            // Reset message count for the next interval
            messageCounts.set(guild.id, 0);
        }
        console.log('[Activity-Tracker] Finished recording stats.');
    }, INTERVAL);

    console.log('[+] Activity Tracker started.');
}
