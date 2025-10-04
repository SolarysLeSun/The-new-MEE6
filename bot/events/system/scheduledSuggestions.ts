

import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { getServerConfig } from '@/lib/db';
import { scheduledSuggestionFlow } from '@/ai/flows/scheduled-suggestion-flow';

const CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour
const lastSent = new Map<string, number>(); // guildId -> timestamp

async function checkAndSendSuggestions(client: Client) {
    console.log('[Scheduled-Suggestions] Checking servers...');
    const guilds = Array.from(client.guilds.cache.values());

    for (const guild of guilds) {
        try {
            const config = await getServerConfig(guild.id, 'community-assistant');
            if (!config?.scheduled_suggestions_enabled || config.suggestion_frequency === 'disabled' || !config.suggestion_channel_id) {
                continue;
            }

            const now = new Date();
            const lastSentTimestamp = lastSent.get(guild.id) || 0;
            const hoursSinceLastSent = (now.getTime() - lastSentTimestamp) / (1000 * 60 * 60);

            let shouldSend = false;
            if (config.suggestion_frequency === 'daily' && hoursSinceLastSent >= 24) {
                shouldSend = true;
            } else if (config.suggestion_frequency === 'weekly' && hoursSinceLastSent >= 24 * 7) {
                shouldSend = true;
            }
            
            if (!shouldSend) continue;

            console.log(`[Scheduled-Suggestions] Sending suggestion to ${guild.name}...`);

            const targetChannel = await guild.channels.fetch(config.suggestion_channel_id).catch(() => null) as TextChannel;
            if (!targetChannel) {
                console.error(`[Scheduled-Suggestions] Channel ${config.suggestion_channel_id} not found in ${guild.name}.`);
                continue;
            }

            const result = await scheduledSuggestionFlow({
                tags: config.suggestion_tags || 'film, jeu vidéo',
                customPrompt: config.suggestion_prompt,
            });

            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle(result.title)
                .setDescription(result.message)
                .setFooter({ text: 'Suggestion du jour par Marcus', iconURL: client.user?.displayAvatarURL() || undefined });

            await targetChannel.send({ embeds: [embed] });
            lastSent.set(guild.id, now.getTime());
            
        } catch (error) {
            console.error(`[Scheduled-Suggestions] Error processing guild ${guild.id}:`, error);
        }
    }
}

export function startScheduledSuggestions(client: Client) {
    // Run once on start, then set interval
    setTimeout(() => checkAndSendSuggestions(client), 5000); 
    setInterval(() => checkAndSendSuggestions(client), CHECK_INTERVAL);
    console.log('[+] Scheduled Suggestions interval started.');
}
