
import { Client, Collection, GuildMember, VoiceState } from 'discord.js';
import { getServerConfig } from '@/lib/db';
import type { AntiAfkConfig } from '@/types';

const afkTimers = new Collection<string, NodeJS.Timeout>();
const CHECK_INTERVAL = 60 * 1000; // Check every minute

export function startAntiAfkInterval(client: Client) {
    setInterval(async () => {
        for (const guild of client.guilds.cache.values()) {
            const config = await getServerConfig(guild.id, 'anti-afk') as AntiAfkConfig | null;
            if (!config?.enabled || !config.afk_channel_id) continue;

            const afkChannel = await guild.channels.fetch(config.afk_channel_id).catch(() => null);
            if (!afkChannel || !afkChannel.isVoiceBased()) continue;

            const voiceStates = guild.voiceStates.cache;
            const timeoutMs = config.timeout_minutes * 60 * 1000;

            for (const vs of voiceStates.values()) {
                if (vs.member && !vs.member.user.bot && vs.channelId !== config.afk_channel_id) {
                    const isAfk = vs.serverDeaf || vs.serverMute;
                    const key = `${guild.id}-${vs.member.id}`;

                    if (isAfk) {
                        if (!afkTimers.has(key)) {
                            // Start AFK timer for this user
                            const timer = setTimeout(() => {
                                console.log(`[Anti-AFK] Moving ${vs.member?.user.tag} to AFK channel in ${guild.name}.`);
                                vs.member?.voice.setChannel(afkChannel, 'Inactivité prolongée').catch(e => console.error(`[Anti-AFK] Failed to move ${vs.member?.user.tag}:`, e));
                                afkTimers.delete(key);
                            }, timeoutMs);
                            afkTimers.set(key, timer);
                        }
                    } else {
                        // User is no longer AFK, clear any existing timer
                        if (afkTimers.has(key)) {
                            clearTimeout(afkTimers.get(key));
                            afkTimers.delete(key);
                        }
                    }
                }
            }
        }
    }, CHECK_INTERVAL);

    console.log('[+] Anti-AFK Interval started.');
}
