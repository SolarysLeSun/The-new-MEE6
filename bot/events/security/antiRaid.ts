

import { Events, GuildMember, Collection, EmbedBuilder, TextChannel } from 'discord.js';
import { getServerConfig } from '../../../src/lib/db';

// --- Anti-Raid Cache ---
// Maps a guild ID to a collection of recent joiner information
interface JoinerInfo {
    id: string;
    username: string;
    timestamp: number;
}
const guildJoinsCache = new Collection<string, JoinerInfo[]>();

const sensitivityThresholds = {
    low: { members: 20, seconds: 15, similarity: 0.95 },
    medium: { members: 10, seconds: 10, similarity: 0.85 },
    high: { members: 5, seconds: 5, similarity: 0.75 },
};

// Simple Levenshtein distance function to check for similar usernames
function levenshteinDistance(a: string, b: string): number {
    const an = a ? a.length : 0;
    const bn = b ? b.length : 0;
    if (an === 0) return bn;
    if (bn === 0) return an;
    const matrix = Array(bn + 1);
    for (let i = 0; i <= bn; ++i) {
        matrix[i] = [i];
    }
    const bMatrix = matrix[0];
    for (let j = 1; j <= an; ++j) {
        bMatrix[j] = j;
    }
    for (let i = 1; i <= bn; ++i) {
        for (let j = 1; j <= an; ++j) {
            const cost = a[j - 1] === b[i - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[bn][an];
}

export const name = Events.GuildMemberAdd;

export async function execute(member: GuildMember) {
    const antiRaidConfig = await getServerConfig(member.guild.id, 'anti-raid');
    
    if (!antiRaidConfig?.enabled) {
        return;
    }

    const now = Date.now();
    const joins = guildJoinsCache.get(member.guild.id) || [];
    
    const sensitivity = antiRaidConfig.sensitivity as 'low' | 'medium' | 'high';
    const { members: joinThreshold, seconds: timeframeSeconds, similarity: similarityThreshold } = sensitivityThresholds[sensitivity];
    const timeframeMs = timeframeSeconds * 1000;

    // Filter out old join timestamps and add the new member
    const recentJoins = joins.filter(j => now - j.timestamp < timeframeMs);
    recentJoins.push({ id: member.id, username: member.user.username, timestamp: now });
    guildJoinsCache.set(member.guild.id, recentJoins);

    let raidReason = '';

    // --- Check 1: Simple Join Velocity ---
    if (recentJoins.length >= joinThreshold) {
        raidReason = `${recentJoins.length} membres ont rejoint en moins de ${timeframeSeconds} secondes.`;
    }

    // --- Check 2: Username Similarity ---
    if (!raidReason && recentJoins.length > 2) { // Only check similarity if enough members joined
        let similarPairs = 0;
        const checkedPairs = new Set<string>();

        for (let i = 0; i < recentJoins.length; i++) {
            for (let j = i + 1; j < recentJoins.length; j++) {
                const pairKey = [recentJoins[i].id, recentJoins[j].id].sort().join('-');
                if (checkedPairs.has(pairKey)) continue;
                
                const distance = levenshteinDistance(recentJoins[i].username.toLowerCase(), recentJoins[j].username.toLowerCase());
                const longerLength = Math.max(recentJoins[i].username.length, recentJoins[j].username.length);
                if (longerLength > 0) {
                    const similarity = (longerLength - distance) / longerLength;
                    if (similarity >= similarityThreshold) {
                        similarPairs++;
                    }
                }
                checkedPairs.add(pairKey);
            }
        }
        // If more than half of the possible pairs are similar, it's a strong signal
        if (similarPairs > (recentJoins.length * (recentJoins.length -1) / 4) ) {
             raidReason = `Une vague de membres avec des pseudonymes très similaires a été détectée.`;
        }
    }


    if (raidReason) {
        // --- RAID DETECTED ---
        console.log(`[Anti-Raid] Raid detected on server ${member.guild.name}. Reason: ${raidReason}`);
        
        // Prevent this from firing multiple times for the same raid wave
        guildJoinsCache.delete(member.guild.id); 

        // Send alert
        if (antiRaidConfig.alert_channel_id) {
            const alertChannel = await member.guild.channels.fetch(antiRaidConfig.alert_channel_id as string).catch(() => null) as TextChannel;
            if (alertChannel) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('🚨 Alerte Anti-Raid 🚨')
                    .setDescription(`Un raid potentiel a été détecté sur le serveur.`)
                    .addFields(
                        { name: 'Raison de la détection', value: raidReason, inline: false },
                        { name: 'Action entreprise', value: `\`${antiRaidConfig.action}\``, inline: true }
                    )
                    .setTimestamp();
                await alertChannel.send({ embeds: [embed] });
            }
        }

        // Take action
        switch (antiRaidConfig.action) {
            case 'lockdown':
                // TODO: Implement server lockdown logic. This is complex.
                // It might involve changing permissions for @everyone on all channels,
                // or setting a flag in the database that the bot checks on every message.
                console.log(`[Anti-Raid] Server lockdown action is not yet implemented.`);
                break;
            case 'kick':
                // TODO: Implement kicking logic.
                // Kick all users who joined during the raid timeframe.
                console.log(`[Anti-Raid] Kick action is not yet implemented.`);
                break;
            case 'ban':
                // TODO: Implement banning logic.
                // Ban all users who joined during the raid timeframe.
                console.log(`[Anti-Raid] Ban action is not yet implemented.`);
                break;
        }
    }
}
