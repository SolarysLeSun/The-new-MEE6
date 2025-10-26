

import { Events, VoiceState, GuildChannel, ChannelType, OverwriteResolvable, PermissionsBitField, Collection, EmbedBuilder } from 'discord.js';
import { getServerConfig, VoiceHub, updateServerConfig } from '@/lib/db';
import type { VoiceHubsConfig } from '@/types';

// Collection to track channels created by this module to prevent race conditions
const managedChannels = new Collection<string, string>(); // <channelId, userId>

export const name = Events.VoiceStateUpdate;

export async function execute(oldState: VoiceState, newState: VoiceState) {
    const { member, guild } = newState;
    if (!member || member.user.bot) return;

    // Log for debugging all voice state updates
    // console.log(`[VoiceHubs] Voice state update detected for ${member.user.tag} in ${guild.name}. Old channel: ${oldState.channel?.name}, New channel: ${newState.channel?.name}`);

    const config = await getServerConfig(guild.id, 'voice-hubs') as VoiceHubsConfig;
    if (!config || !config.enabled) {
        return;
    }
    
    // --- User Joins a Hub Channel ---
    const allConfiguredHubs = config.hubs || [];
    const hubConfig = allConfiguredHubs.find(h => h.creator_channel_id === newState.channelId);

    // This logic triggers if the user enters a channel that is specifically configured as a hub creator, and it's a new channel for them.
    if (newState.channelId && newState.channelId !== oldState.channelId && hubConfig) {
        console.log(`[VoiceHubs] User ${member.user.tag} joined a configured hub channel: ${newState.channel?.name} (${newState.channelId})`);
        await createAndMove(newState, hubConfig);
        return;
    }
    
    // --- User Leaves a Temp Channel (check for deletion) ---
    if (oldState.channelId && oldState.channel?.parentId === config.dest_category_id && managedChannels.has(oldState.channelId)) {
        const tempChannel = oldState.channel;
        
        // Use a small delay to account for users switching channels quickly
        setTimeout(async () => {
            try {
                // Re-fetch the channel to get the most up-to-date member count
                const freshChannel = await guild.channels.fetch(tempChannel.id).catch(() => null) as GuildChannel;
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
                allow: [PermissionsBitField.Flags.ViewChannel],
                deny: [PermissionsBitField.Flags.Connect], // Deny connection by default
            }
        ];
        
        // Explicitly allow connection for the creator
        permissionOverwrites.push({
            id: member.id,
            allow: [PermissionsBitField.Flags.Connect]
        });
        
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

        // Send a welcome embed in the newly created channel's associated text channel if possible
        const welcomeEmbed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle(`Salon de ${member.displayName}`)
            .setDescription(`Bienvenue dans votre salon privé, ${member.toString()} !`)
            .addFields(
                { name: 'Permissions', value: 'Vous pouvez renommer ce salon, déplacer, rendre muet et expulser des membres à l'intérieur.' },
                { name: 'Disparition', value: 'Ce salon sera automatiquement supprimé lorsqu\'il sera vide.' }
            )
            .setFooter({ text: `Créé via le hub : ${newState.channel?.name}`})
            .setTimestamp();
        
        // Try to find a general text channel to post this, or the log channel.
        const logChannel = config.log_channel_id ? await guild.channels.fetch(config.log_channel_id).catch(() => null) : null;
        if (logChannel && logChannel.isTextBased()) {
            await logChannel.send({ embeds: [welcomeEmbed] });
        }
        
        if (hubConfig.enable_smart_voice) {
            const smartVoiceConfig = await getServerConfig(guild.id, 'smart-voice');
            if (smartVoiceConfig && smartVoiceConfig.interactive_category_id !== config.dest_category_id) {
                // Ensure the smart voice module watches this category
                smartVoiceConfig.interactive_category_id = config.dest_category_id;
                await updateServerConfig(guild.id, 'smart-voice', smartVoiceConfig);
                console.log(`[VoiceHubs] Smart Voice a été activé pour la catégorie de destination des hubs.`);
            }
        }

    } catch (error) {
        console.error(`[VoiceHubs] Failed to create or move user to temporary channel:`, error);
        // Kick the user from the hub channel to prevent them from being stuck
        await newState.setChannel(null).catch(e => console.error(`[VoiceHubs] Failed to disconnect user after creation error:`, e));
    }
}
