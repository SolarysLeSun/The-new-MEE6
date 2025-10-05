
import { Events, VoiceState, Collection } from 'discord.js';
import { getServerConfig, updateAffinityScore } from '@/lib/db';

const voiceSessions = new Collection<string, { guildId: string, channelId: string, joinedAt: number }>();

export const name = Events.VoiceStateUpdate;

export async function execute(oldState: VoiceState, newState: VoiceState) {
    const config = await getServerConfig(newState.guild.id, 'affinites');
    if (!config?.enabled || !config.points_per_minute_in_voice) return;

    // User joins a channel or switches
    if (!oldState.channelId && newState.channelId) {
        voiceSessions.set(newState.id, {
            guildId: newState.guild.id,
            channelId: newState.channelId,
            joinedAt: Date.now()
        });
    }

    // User leaves a channel
    if (oldState.channelId && !newState.channelId) {
        const session = voiceSessions.get(oldState.id);
        if (!session) return;

        const durationMinutes = (Date.now() - session.joinedAt) / (1000 * 60);
        if (durationMinutes < 1) return; // Ignore very short sessions

        const channel = await oldState.guild.channels.fetch(oldState.channelId);
        if (!channel || !channel.isVoiceBased()) return;
        
        // Award points to all other members in the channel
        for (const member of channel.members.values()) {
            if (member.id === oldState.id || member.user.bot) continue;
            
            const pointsToAdd = Math.round(durationMinutes * config.points_per_minute_in_voice);
            if (pointsToAdd > 0) {
                 updateAffinityScore(oldState.guild.id, oldState.id, member.id, pointsToAdd);
            }
        }
        
        voiceSessions.delete(oldState.id);
    }
    
    // User switches channel - treat as a leave then join
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        // Trigger leave logic
        const session = voiceSessions.get(oldState.id);
         if (session) {
            const durationMinutes = (Date.now() - session.joinedAt) / (1000 * 60);
            const channel = await oldState.guild.channels.fetch(oldState.channelId);
             if (channel && channel.isVoiceBased() && durationMinutes >= 1) {
                 for (const member of channel.members.values()) {
                     if (member.id === oldState.id || member.user.bot) continue;
                     const pointsToAdd = Math.round(durationMinutes * config.points_per_minute_in_voice);
                     if (pointsToAdd > 0) {
                        updateAffinityScore(oldState.guild.id, oldState.id, member.id, pointsToAdd);
                     }
                 }
             }
         }
        // Trigger join logic
         voiceSessions.set(newState.id, {
            guildId: newState.guild.id,
            channelId: newState.channelId,
            joinedAt: Date.now()
        });
    }
}
