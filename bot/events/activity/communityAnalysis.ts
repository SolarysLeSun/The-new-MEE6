

'use server';

import { Client, Collection, Events, Message, VoiceState } from 'discord.js';
import { getServerConfig, db } from '@/lib/db';

const BUCKET_DURATION = 30 * 60 * 1000; // 30 minutes
const FLUSH_INTERVAL = 5 * 60 * 1000;   // 5 minutes

// In-memory state
const activityState = new Collection<string, {
    messageCount: number;
    activeTextUsers: Set<string>;
    activeVoiceUsers: Set<string>;
    voiceTimeTracker: Collection<string, { joinTime: number }>;
    cumulativeVoiceMinutes: number;
}>();

function getBucketTimestamp(timestamp: number = Date.now()) {
    return Math.floor(timestamp / BUCKET_DURATION) * BUCKET_DURATION;
}

async function flushActivityToDB(guildId: string) {
    const state = activityState.get(guildId);
    if (!state) return;

    const timestamp = getBucketTimestamp(Date.now() - 1000); // Use previous bucket to avoid race conditions

    try {
        const stmt = db.prepare(`
            INSERT INTO community_activity_stats (guild_id, timestamp_bucket, message_count, active_voice_members_count, cumulative_voice_minutes, active_text_members_count)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(guild_id, timestamp_bucket) DO UPDATE SET
                message_count = message_count + excluded.message_count,
                active_voice_members_count = excluded.active_voice_members_count,
                cumulative_voice_minutes = cumulative_voice_minutes + excluded.cumulative_voice_minutes,
                active_text_members_count = excluded.active_text_members_count;
        `);

        stmt.run(
            guildId,
            new Date(timestamp).toISOString(),
            state.messageCount,
            state.activeVoiceUsers.size,
            Math.round(state.cumulativeVoiceMinutes),
            state.activeTextUsers.size
        );
        
        console.log(`[Activity Analysis] Flushed data for guild ${guildId} for bucket ${new Date(timestamp).toISOString()}`);

    } catch (e) {
        console.error(`[Activity Analysis] Failed to flush DB for guild ${guildId}:`, e);
    }

    // Reset state for the new interval
    activityState.set(guildId, {
        messageCount: 0,
        activeTextUsers: new Set(),
        activeVoiceUsers: new Set(),
        voiceTimeTracker: new Collection(),
        cumulativeVoiceMinutes: 0,
    });
}

export function startCommunityAnalysisInterval(client: Client) {
    console.log('[+] Community Analysis Interval started.');
    
    // Initial setup for all guilds
    client.guilds.cache.forEach(guild => {
         activityState.set(guild.id, {
            messageCount: 0,
            activeTextUsers: new Set(),
            activeVoiceUsers: new Set(),
            voiceTimeTracker: new Collection(),
            cumulativeVoiceMinutes: 0,
        });
    });

    setInterval(() => {
        client.guilds.cache.forEach(async guild => {
            const config = await getServerConfig(guild.id, 'community-analysis');
            if (!config?.enabled || !config.premium) return;

            const state = activityState.get(guild.id);
            if (!state) return;

            // --- Update Cumulative Voice Time ---
            guild.voiceStates.cache.forEach(vs => {
                if (vs.member && !vs.member.user.bot && !vs.serverDeaf) {
                    const tracker = state.voiceTimeTracker.get(vs.member.id);
                    if (tracker) {
                        const timeSpent = (Date.now() - tracker.joinTime) / (1000 * 60);
                        state.cumulativeVoiceMinutes += timeSpent;
                        tracker.joinTime = Date.now(); // Reset join time for next interval
                    }
                }
            });

            // Flush data to DB
            flushActivityToDB(guild.id);
        });
    }, FLUSH_INTERVAL);
}

// --- Event Handlers ---

export const messageCreateHandler = async (message: Message) => {
    if (!message.guild || message.author.bot) return;
    const config = await getServerConfig(message.guild.id, 'community-analysis');
    if (!config?.enabled || !config.premium) return;

    const state = activityState.get(message.guild.id);
    if (!state) return;

    state.messageCount++;
    state.activeTextUsers.add(message.author.id);
};

export const voiceStateUpdateHandler = async (oldState: VoiceState, newState: VoiceState) => {
    const member = newState.member;
    if (!member || member.user.bot) return;

    const config = await getServerConfig(newState.guild.id, 'community-analysis');
    if (!config?.enabled || !config.premium) return;
    
    const state = activityState.get(newState.guild.id);
    if (!state) return;

    const wasActive = oldState.channel && !oldState.serverDeaf;
    const isActive = newState.channel && !newState.serverDeaf;
    
    // User becomes active in voice
    if (!wasActive && isActive) {
        state.activeVoiceUsers.add(member.id);
        state.voiceTimeTracker.set(member.id, { joinTime: Date.now() });
    } 
    // User becomes inactive in voice
    else if (wasActive && !isActive) {
        state.activeVoiceUsers.delete(member.id);
        const tracker = state.voiceTimeTracker.get(member.id);
        if (tracker) {
             const timeSpent = (Date.now() - tracker.joinTime) / (1000 * 60); // in minutes
             state.cumulativeVoiceMinutes += timeSpent;
             state.voiceTimeTracker.delete(member.id);
        }
    }
};

// We attach these handlers to the main bot events
client.on(Events.MessageCreate, messageCreateHandler);
client.on(Events.VoiceStateUpdate, voiceStateUpdateHandler);
