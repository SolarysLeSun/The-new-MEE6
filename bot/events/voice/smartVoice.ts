

'use server';

import { Events, VoiceState, ActivityType, Collection, ChannelType, GuildChannel, NonThreadGuildBasedChannel, VoiceChannel } from 'discord.js';
import { smartVoiceFlow } from '../../../src/ai/flows/smart-voice-flow';
import { getServerConfig, getGlobalAiStatus } from '../../../src/lib/db';


// Simple cache to prevent spamming the API for the same channel within a short time
const channelUpdateCache = new Collection<string, number>();
const UPDATE_COOLDOWN = 60000; // 1 minute (60,000 ms)

async function updateChannelName(channel: NonThreadGuildBasedChannel) {
    if (channel.type !== ChannelType.GuildVoice) return;
    
    // Global AI check
    const globalAiStatus = getGlobalAiStatus();
    if (globalAiStatus.disabled) return;

    const smartVoiceConfig = await getServerConfig(channel.guild.id, 'smart-voice');
    const isPremium = smartVoiceConfig?.premium || false;
    
    // Check if the module is enabled, premium, and if the channel is in the interactive category
    if (!smartVoiceConfig?.enabled || !isPremium || !smartVoiceConfig.interactive_category_id || channel.parentId !== smartVoiceConfig.interactive_category_id) {
        return;
    }
    
    // --- Cooldown check to prevent API spam ---
    const now = Date.now();
    const lastUpdate = channelUpdateCache.get(channel.id);
    if (lastUpdate && now - lastUpdate < UPDATE_COOLDOWN) {
        // Allow rename for empty channels to reset them, bypassing cooldown
        if (channel.members.size > 0) {
            return;
        }
    }
    
    const defaultChannelName = smartVoiceConfig.default_channel_name || "Vocal intéractif";

    // --- Reset channel if empty ---
    if (channel.members.size === 0) {
        if (channel.name !== defaultChannelName) {
            console.log(`[Smart-Voice] Channel "${channel.name}" is empty. Resetting.`);
            try {
                await channel.setName(defaultChannelName);
                if (channel instanceof VoiceChannel) {
                    await channel.setTopic('');
                }
                channelUpdateCache.delete(channel.id); // Clear cache on reset
            } catch (error) {
                console.error(`[Smart-Voice] Failed to reset channel ${channel.id}. It might have been deleted or a race condition occurred.`, error);
            }
        }
        return;
    }
    
    try {
        const members = channel.members.filter(m => !m.user.bot);
        const memberCount = members.size;
        
        // --- Enhanced Activity Gathering ---
        const activityCounts: Record<string, number> = {};
        let streamingCount = 0;
        let webcamCount = 0;

        members.forEach(member => {
            if (member.voice.streaming) streamingCount++;
            if (member.voice.selfVideo) webcamCount++;
            // Gracefully handle cases where presence or activities might be null/undefined
            const game = member.presence?.activities.find(activity => activity.type === ActivityType.Playing)?.name;
            if (game) {
                activityCounts[game] = (activityCounts[game] || 0) + 1;
            }
        });
        
        const activitiesSummary: string[] = [];
        for (const [game, count] of Object.entries(activityCounts)) {
            activitiesSummary.push(`${count} playing ${game}`);
        }
        if (streamingCount > 0) activitiesSummary.push(`${streamingCount} streaming`);
        if (webcamCount > 0) activitiesSummary.push(`${webcamCount} with webcam on`);
        
        const activitiesString = activitiesSummary.length > 0 ? activitiesSummary.join(', ') : 'Just chatting';
        
        console.log(`[Smart-Voice] Updating channel "${channel.name}" (${channel.id}). Members: ${memberCount}, Activities: ${activitiesString}`);

        const result = await smartVoiceFlow({
            currentName: channel.name,
            theme: channel.name, // Using channel name as a proxy for theme, can be improved
            memberCount: memberCount,
            activities: activitiesString,
            customInstructions: smartVoiceConfig.custom_instructions
        });

        // Only rename if the new name is different and not empty
        if (result.channelName && result.channelName !== channel.name) {
            await channel.setName(result.channelName);
            if (channel instanceof VoiceChannel && result.channelBio) {
                await channel.setTopic(result.channelBio);
            }
            console.log(`[Smart-Voice] Renamed channel ${channel.id} to "${result.channelName}". Bio: "${result.channelBio}"`);
            
            // Update cache timestamp after a successful rename
            channelUpdateCache.set(channel.id, now);
        } else {
            console.log(`[Smart-Voice] AI proposed the same name or an empty name. No change made for channel ${channel.id}.`);
        }

    } catch (error) {
        console.error(`[Smart-Voice] Error during smart voice flow for channel ${channel.id}:`, error);
    }
}


export const name = Events.VoiceStateUpdate;

export async function execute(oldState: VoiceState, newState: VoiceState) {
    const oldChannel = oldState.channel;
    const newChannel = newState.channel;

    // A user's state changed (e.g., streaming, camera on/off, activity change) but they stayed in the same channel.
    // This is hard to detect with VoiceStateUpdate alone, but we catch joins/leaves/switches.
    // A PresenceUpdate event handler would be needed for perfect activity tracking.

    // User joined a channel or switched from another one
    if (newChannel && newChannel.id !== oldChannel?.id) {
        await updateChannelName(newChannel);
    }

    // User left a channel (and didn't join another) or switched
    if (oldChannel && oldChannel.id !== newChannel?.id) {
        await updateChannelName(oldChannel);
    }
}


