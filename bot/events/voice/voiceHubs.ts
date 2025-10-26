

import { Events, VoiceState, GuildChannel, ChannelType, OverwriteResolvable, PermissionsBitField, Collection } from 'discord.js';
import { getServerConfig, VoiceHub } from '@/lib/db';
import type { VoiceHubsConfig } from '@/types';

// Collection to track channels created by this module to prevent race conditions
const managedChannels = new Collection<string, string>(); // <channelId, userId>

export const name = Events.VoiceStateUpdate;

export async function execute(oldState: VoiceState, newState: VoiceState) {
    const { member, guild } = newState;
    if (!member || member.user.bot) return;

    const config = await getServerConfig(guild.id, 'voice-hubs') as VoiceHubsConfig;
    if (!config || !config.enabled || !config.hub_category_id || !config.dest_category_id) {
        return;
    }
    
    const hubCategoryId = config.hub_category_id;
    const destCategoryId = config.dest_category_id;

    // --- User Joins a Hub Channel ---
    if (newState.channelId && newState.channel?.parentId === hubCategoryId) {
        const hubChannel = newState.channel;
        
        // Find hub config (if it's a configured hub channel)
        const hubConfig = config.hubs.find(h => h.creator_channel_id === hubChannel.id);
        if(!hubConfig) {
             // If not a pre-configured hub, try to parse from name like "Private (2)"
            const nameMatch = hubChannel.name.match(/\((\d+)\)/);
            const userLimit = nameMatch ? parseInt(nameMatch[1], 10) : 0;
            
            if (userLimit > 0) {
                 await createAndMove(newState, {
                    id: hubChannel.id,
                    creator_channel_id: hubChannel.id,
                    name_format: "Salon de {user}",
                    user_limit: userLimit,
                    enable_smart_voice: false,
                });
            }
            return;
        }
        
        await createAndMove(newState, hubConfig);
    }
    
    // --- User Leaves a Temp Channel (check for deletion) ---
    if (oldState.channelId && oldState.channel?.parentId === destCategoryId && managedChannels.has(oldState.channelId)) {
        const tempChannel = oldState.channel;
        
        // Use a small delay to account for users switching channels quickly
        setTimeout(async () => {
            try {
                // Re-fetch the channel to get the most up-to-date member count
                const freshChannel = await guild.channels.fetch(tempChannel.id) as GuildChannel;
                if (freshChannel && freshChannel.isVoiceBased() && freshChannel.members.size === 0) {
                    console.log(`[VoiceHubs] Deleting empty temporary channel: ${freshChannel.name}`);
                    await freshChannel.delete('Channel is empty.');
                    managedChannels.delete(freshChannel.id);
                }
            } catch (error: any) {
                // If channel is already deleted, just clean up the cache
                if (error.code === 10003) { // Unknown Channel
                    managedChannels.delete(tempChannel.id);
                } else {
                     console.error(`[VoiceHubs] Error checking/deleting channel ${tempChannel.id}:`, error);
                }
            }
        }, 500); // 500ms delay
    }
}


async function createAndMove(newState: VoiceState, hubConfig: VoiceHub) {
    const { member, guild } = newState;
    if (!member || !guild) return;

    const config = await getServerConfig(guild.id, 'voice-hubs') as VoiceHubsConfig;
     if (!config || !config.dest_category_id) {
        console.error(`[VoiceHubs] Destination category not configured for guild ${guild.id}.`);
        return;
    }
    
    const activityName = member.presence?.activities.find(a => a.type === 0)?.name || 'Discussion';
    const memberCount = (newState.channel?.members.size || 1).toString();

    // Replace variables in channel name
    const channelName = hubConfig.name_format
        .replace('{user}', member.displayName)
        .replace('{activite}', activityName)
        .replace('{mb.connect}', memberCount);


    try {
        console.log(`[VoiceHubs] Creating temporary channel for ${member.user.tag}...`);

        const permissionOverwrites: OverwriteResolvable[] = [
            {
                id: member.id,
                allow: [
                    PermissionsBitField.Flags.ManageChannels,
                    PermissionsBitField.Flags.MuteMembers,
                    PermissionsBitField.Flags.DeafenMembers,
                    PermissionsBitField.Flags.MoveMembers,
                    PermissionsBitField.Flags.Stream,
                    PermissionsBitField.Flags.PrioritySpeaker,
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.Connect
                ]
            },
            {
                id: guild.roles.everyone,
                allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ViewChannel],
                 deny: [PermissionsBitField.Flags.Speak]
            }
        ];
        
        const tempChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            parent: config.dest_category_id,
            userLimit: hubConfig.user_limit > 0 ? hubConfig.user_limit : undefined,
            permissionOverwrites: permissionOverwrites,
            reason: `Hub vocal créé par ${member.user.tag}`
        });
        
        managedChannels.set(tempChannel.id, member.id);

        console.log(`[VoiceHubs] Moving ${member.user.tag} to new channel: ${tempChannel.name}`);
        await newState.setChannel(tempChannel);

        if (hubConfig.enable_smart_voice) {
            const smartVoiceConfig = await getServerConfig(guild.id, 'smart-voice');
            if (smartVoiceConfig) {
                const updatedConfig = {
                    ...smartVoiceConfig,
                    interactive_category_id: config.dest_category_id, 
                };
                console.log(`[VoiceHubs] Smart Voice is enabled for hub-created channel ${tempChannel.name}`);
            }
        }

    } catch (error) {
        console.error(`[VoiceHubs] Failed to create or move user to temporary channel:`, error);
        // Kick the user from the hub channel to prevent them from being stuck
        await newState.setChannel(null).catch(e => console.error(`[VoiceHubs] Failed to disconnect user after creation error:`, e));
    }
}
