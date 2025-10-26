

'use server';

import { Client, Collection, Events, Message, VoiceState } from 'discord.js';
import { getServerConfig, db, setupDefaultConfigs } from '@/lib/db';

const BUCKET_DURATION = 5 * 60 * 1000; // 5 minutes
const FLUSH_INTERVAL = 5 * 60 * 1000;   // 5 minutes

// In-memory state
const activityState = new Collection<string, {
    messageCount: number;
    activeTextUsers: Set<string>;
    voiceTimeTracker: Collection<string, { joinTime: number }>;
    completedVoiceSessionsMinutes: number;
}>();

function getBucketTimestamp(timestamp: number = Date.now()) {
    return Math.floor(timestamp / BUCKET_DURATION) * BUCKET_DURATION;
}

async function flushActivityToDB(client: Client, guildId: string) {
    const state = activityState.get(guildId);
    if (!state) return;

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) {
        console.warn(`[Activity Analysis] Could not find guild ${guildId} during flush.`);
        return;
    }

    // --- Calculate voice time for currently connected users ---
    let ongoingVoiceMinutes = 0;
    const now = Date.now();
    
    // Itérer sur les membres actuellement dans les salons vocaux suivis par notre tracker
    state.voiceTimeTracker.forEach((tracker, memberId) => {
        const member = guild.voiceStates.cache.get(memberId);
        // Si le membre est toujours actif en vocal
        if (member?.channel && !member.serverDeaf) {
            const timeSpent = (now - tracker.joinTime) / (1000 * 60);
            ongoingVoiceMinutes += timeSpent;
            // Reset the join time for the next interval
            tracker.joinTime = now;
        } else {
            // Le membre a quitté le vocal entre-temps, on le retire du tracker
            state.voiceTimeTracker.delete(memberId);
        }
    });
   
    const totalVoiceMinutes = state.completedVoiceSessionsMinutes + ongoingVoiceMinutes;

    // --- Save to Database ---
    const timestamp = getBucketTimestamp(now - 1000); // Use previous bucket to avoid race conditions
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
            guild.voiceStates.cache.filter((vs: VoiceState) => vs.member && !vs.member.user.bot && vs.channel && !vs.serverDeaf).size,
            Math.round(totalVoiceMinutes),
            state.activeTextUsers.size
        );
        
        console.log(`[Activity Analysis] Flushed data for guild ${guildId}. Voice Mins: ${totalVoiceMinutes.toFixed(2)}, Messages: ${state.messageCount}.`);

    } catch (e) {
        console.error(`[Activity Analysis] Failed to flush DB for guild ${guildId}:`, e);
    }

    // --- Reset state for the new interval ---
    state.messageCount = 0;
    state.activeTextUsers.clear();
    state.completedVoiceSessionsMinutes = 0;
}

export function startCommunityAnalysisInterval(client: Client) {
    console.log('[+] Community Analysis Interval started.');
    
    // Initial setup for all guilds
    client.guilds.cache.forEach(guild => {
         activityState.set(guild.id, {
            messageCount: 0,
            activeTextUsers: new Set(),
            voiceTimeTracker: new Collection<string, { joinTime: number }>(),
            completedVoiceSessionsMinutes: 0,
        });
        
        // Pre-fill trackers for members already in voice on startup
        guild.voiceStates.cache.forEach(vs => {
            if(vs.member && !vs.member.user.bot && vs.channel && !vs.serverDeaf) {
                 activityState.get(guild.id)!.voiceTimeTracker.set(vs.member.id, { joinTime: Date.now() });
            }
        });
    });

    setInterval(() => {
        client.guilds.cache.forEach(async guild => {
            const config = await getServerConfig(guild.id, 'community-analysis');
            if (!config?.enabled || !config.premium) return;

            const state = activityState.get(guild.id);
            if (!state) return;

            flushActivityToDB(client, guild.id);
        });
    }, FLUSH_INTERVAL);
}

// --- Event Handlers ---

export const messageCreateHandler = async (message: Message) => {
    if (!message.guild || message.author.bot) return;
    const config = await getServerConfig(message.guild.id, 'community-analysis');
    if (!config?.enabled || !config.premium) return;

    let state = activityState.get(message.guild.id);
    if (!state) { // Initialize state if it doesn't exist for some reason
        state = {
            messageCount: 0,
            activeTextUsers: new Set(),
            voiceTimeTracker: new Collection<string, { joinTime: number }>(),
            completedVoiceSessionsMinutes: 0,
        };
        activityState.set(message.guild.id, state);
    }

    state.messageCount++;
    state.activeTextUsers.add(message.author.id);
};

export const voiceStateUpdateHandler = async (oldState: VoiceState, newState: VoiceState) => {
    const member = newState.member;
    if (!member || member.user.bot) return;

    let config = await getServerConfig(newState.guild.id, 'community-analysis');
     // If config doesn't exist, create it. This is the crucial fix.
    if (!config) {
        setupDefaultConfigs(newState.guild.id);
        config = await getServerConfig(newState.guild.id, 'community-analysis');
    }
    
    if (!config?.enabled || !config.premium) return;
    
    let state = activityState.get(newState.guild.id);
    if (!state) { // Initialize state if it doesn't exist
        state = {
            messageCount: 0,
            activeTextUsers: new Set(),
            voiceTimeTracker: new Collection<string, { joinTime: number }>(),
            completedVoiceSessionsMinutes: 0,
        };
        activityState.set(newState.guild.id, state);
    }

    const wasActive = oldState.channel && !oldState.serverDeaf;
    const isActive = newState.channel && !newState.serverDeaf;
    
    // User becomes active in voice
    if (!wasActive && isActive) {
        state.voiceTimeTracker.set(member.id, { joinTime: Date.now() });
    } 
    // User becomes inactive in voice
    else if (wasActive && !isActive) {
        const tracker = state.voiceTimeTracker.get(member.id);
        if (tracker) {
             const timeSpent = (Date.now() - tracker.joinTime) / (1000 * 60); // in minutes
             state.completedVoiceSessionsMinutes += timeSpent;
             state.voiceTimeTracker.delete(member.id);
        }
    }
};
