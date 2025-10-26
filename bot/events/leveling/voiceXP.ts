

import { Client } from 'discord.js';
import { getServerConfig, updateUserXP, getOwnerXPBoost } from '@/lib/db';

const INTERVAL = 60 * 1000; // 1 minute
const OWNER_ID = '556529963877138442';

export function startVoiceXPInterval(client: Client) {
    setInterval(async () => {
        for (const guild of client.guilds.cache.values()) {
            if (!guild || !guild.id) continue;

            const config = await getServerConfig(guild.id, 'leveling');
            if (!config?.enabled || !config.xp_per_minute_in_voice || config.xp_per_minute_in_voice <= 0) continue;

            const voiceStates = guild.voiceStates.cache;
            if (voiceStates.size === 0) continue;

            for (const vs of voiceStates.values()) {
                if (
                    vs.member && !vs.member.user.bot && // Is a user
                    vs.channelId && // Is in a channel
                    !config.ignored_channels?.includes(vs.channelId) && // Not in an ignored channel
                    !vs.selfDeaf && !vs.serverDeaf // Is not deafened
                ) {
                    let xpToGive = config.xp_per_minute_in_voice;

                    // --- Global Owner Boost ---
                    if (vs.member.id === OWNER_ID) {
                        const ownerMultiplier = getOwnerXPBoost();
                        if (ownerMultiplier > 1) {
                            xpToGive *= ownerMultiplier;
                        }
                    }

                    // Apply webcam boost
                    if (vs.selfVideo && config.xp_boost_webcam_multiplier > 1) {
                        xpToGive *= config.xp_boost_webcam_multiplier;
                    }

                    // Apply channel/role boosts
                    const channelBoost = config.xp_boost_channels?.find((c:any) => c.channel_id === vs.channelId);
                    if (channelBoost) {
                        xpToGive *= channelBoost.multiplier;
                    }
                    
                    let highestRoleMultiplier = 1;
                    vs.member.roles.cache.forEach(role => {
                         const roleBoost = config.xp_boost_roles?.find((b:any) => b.role_id === role.id);
                         if (roleBoost && roleBoost.multiplier > highestRoleMultiplier) {
                             highestRoleMultiplier = roleBoost.multiplier;
                         }
                    });
                    xpToGive *= highestRoleMultiplier;

                    updateUserXP(vs.member.id, guild.id, Math.round(xpToGive));
                }
            }
        }
    }, INTERVAL);
     console.log('[+] Voice XP Interval started.');
}
