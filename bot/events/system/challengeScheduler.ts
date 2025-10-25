import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { schedule } from 'node-cron';
import { getAllBotServers, getServerConfig, setDailyChallenges } from '@/lib/db';
import { challengeGenerationFlow } from '@/ai/flows/challenge-flow';

export function startChallengeScheduler(client: Client) {
    // Schedule to run every day at midnight server time.
    schedule('0 0 * * *', async () => {
        console.log('[Challenges] Running daily challenge generation...');
        const guilds = getAllBotServers();

        for (const guildInfo of guilds) {
            try {
                const config = getServerConfig(guildInfo.id, 'challenges');
                if (!config?.enabled) {
                    continue;
                }
                
                const guild = await client.guilds.fetch(guildInfo.id).catch(() => null);
                if (!guild) continue;
                
                console.log(`[Challenges] Generating challenges for guild: ${guild.name}`);

                const result = await challengeGenerationFlow({
                    // For now, we don't have historical data, so we pass an empty array.
                    existingChallenges: [],
                    serverType: 'general', // This could be made configurable in the future
                });
                
                if (result && result.challenges.length > 0) {
                    setDailyChallenges(guild.id, result.challenges);
                    console.log(`[Challenges] Successfully generated ${result.challenges.length} challenges for ${guild.name}.`);

                    // Announce new challenges
                    if (config.channel_id) {
                         const channel = await guild.channels.fetch(config.channel_id).catch(() => null) as TextChannel;
                         if (channel) {
                             const embed = new EmbedBuilder()
                                .setTitle('⚔️ Nouveaux Défis Quotidiens !')
                                .setDescription('De nouveaux défis sont disponibles. Accomplissez-les pour gagner de l\'XP ! Utilisez `/defis` pour voir la liste.')
                                .setColor(0xFFA500)
                                .setTimestamp();

                             let content = '';
                             if (config.mention_role_id && config.mention_role_id !== 'none') {
                                 content = `<@&${config.mention_role_id}>`;
                             }
                             await channel.send({ content, embeds: [embed] });
                         }
                    }
                }
            } catch (error) {
                console.error(`[Challenges] Failed to generate challenges for guild ${guildInfo.id}:`, error);
            }
        }
    }, {
        scheduled: true,
        timezone: "Europe/Paris" // Or use a server-specific timezone if available
    });

    console.log('[+] Daily Challenge Scheduler started.');
}