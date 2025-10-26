

'use server';

import { Client, ChannelType, GuildChannel, Guild, CategoryChannel } from 'discord.js';

const API_URL = process.env.BOT_API_URL || 'http://localhost:3001/api';
const INTERVAL = 5 * 60 * 1000; // 5 minutes

// Map to store the IDs of the managed stat channels for each guild
interface ManagedChannels {
    categoryId?: string;
    membersChannelId?: string;
    voiceChannelId?: string;
    boostsChannelId?: string;
}
const managedChannels = new Map<string, ManagedChannels>();

async function getOrCreateChannel(guild: Guild, category: CategoryChannel, currentChannelId: string | undefined, name: string): Promise<GuildChannel> {
    let channel: GuildChannel | undefined;
    if (currentChannelId) {
        channel = await guild.channels.fetch(currentChannelId).catch(() => undefined) as GuildChannel;
    }
    
    if (!channel) {
        channel = guild.channels.cache.find(c => c.parentId === category.id && c.name.startsWith(name.split(':')[0])) as GuildChannel;
    }
    
    if (channel) {
        if (channel.name !== name) {
            await channel.setName(name);
        }
        return channel;
    }
    
    return await guild.channels.create({
        name,
        type: ChannelType.GuildVoice,
        parent: category,
        permissionOverwrites: [
            {
                id: guild.id, // @everyone
                deny: ['Connect'],
            },
        ],
        reason: "Canal de statistiques du bot Marcus"
    });
}

async function updateGuildStats(guild: Guild): Promise<void> {
    await guild.members.fetch(); 
    const memberCount = guild.memberCount;
    const boostCount = guild.premiumSubscriptionCount || 0;
    const voiceCount = guild.voiceStates.cache.size;

    let channels = managedChannels.get(guild.id) || {};
    let category: CategoryChannel | undefined;

    const categoryName = `- ${guild.name} - ${memberCount} membres -`;

    if (channels.categoryId) {
        category = await guild.channels.fetch(channels.categoryId).catch(() => undefined) as CategoryChannel;
    }
    
    if (!category) {
        category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.includes(guild.name)) as CategoryChannel;
    }
    
    if (!category || category.name !== categoryName) {
        // If category exists but name is wrong, or doesn't exist, create/update
        if (category) {
            await category.setName(categoryName);
        } else {
             // Creating a new one because it might have been deleted.
             // We won't try to auto-create categories to avoid spamming. This should be done from the panel.
             return;
        }
    }
    
    channels.categoryId = category.id;

    const membersChannel = await getOrCreateChannel(guild, category, channels.membersChannelId, `👤 Membres : ${memberCount}`);
    channels.membersChannelId = membersChannel.id;
    
    const voiceChannel = await getOrCreateChannel(guild, category, channels.voiceChannelId, `🔊 En vocal : ${voiceCount}`);
    channels.voiceChannelId = voiceChannel.id;

    const boostsChannel = await getOrCreateChannel(guild, category, channels.boostsChannelId, `💎 Boosts : ${boostCount}`);
    channels.boostsChannelId = boostsChannel.id;
    
    managedChannels.set(guild.id, channels);
}

export function startStatsChannelInterval(client: Client) {
    console.log('[+] Stats Channel Interval started.');
    setInterval(async () => {
        for (const guild of client.guilds.cache.values()) {
            // We only update guilds that have initiated the setup via the panel
            if (managedChannels.has(guild.id)) {
                try {
                    await updateGuildStats(guild);
                } catch (error) {
                    console.error(`[Stats-Channels] Failed to update stats for guild ${guild.id}:`, error);
                    // If a channel was deleted, clear the cache to force recreation
                    if ((error as any).code === 10003) { // Unknown Channel
                        managedChannels.delete(guild.id);
                    }
                }
            }
        }
    }, INTERVAL);
}

export async function createStatsChannels(guild: Guild): Promise<ManagedChannels> {
    const memberCount = guild.memberCount;
    const categoryName = `- ${guild.name} - ${memberCount} membres -`;

    let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.includes(guild.name)) as CategoryChannel | undefined;

    if (category) {
        await category.setName(categoryName);
    } else {
        category = await guild.channels.create({
            name: categoryName,
            type: ChannelType.GuildCategory,
            position: 0
        });
    }

    // Force update immediately, which will also create the channels
    const channels: ManagedChannels = { categoryId: category.id };
    managedChannels.set(guild.id, channels);
    await updateGuildStats(guild);
    
    return managedChannels.get(guild.id)!;
}
