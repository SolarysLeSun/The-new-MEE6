

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, getGuildLeaderboard } from '@/lib/db';

const TopXPCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('topxp')
        .setDescription('Affiche le classement des utilisateurs les plus actifs du serveur.'),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', flags: MessageFlags.Ephemeral });
            return;
        }

        const config = await getServerConfig(interaction.guild.id, 'leveling');
        if (!config?.enabled) {
            await interaction.reply({ content: 'Le système de niveaux est désactivé sur ce serveur.', flags: MessageFlags.Ephemeral });
            return;
        }
        
        await interaction.deferReply();

        try {
            const leaderboard = getGuildLeaderboard(interaction.guild.id, 10);
            
            if (leaderboard.length === 0) {
                await interaction.editReply({ content: 'Aucune donnée de niveau disponible pour ce serveur.' });
                return;
            }

            const leaderboardEntries = await Promise.all(leaderboard.map(async (entry, index) => {
                try {
                    const user = await interaction.client.users.fetch(entry.user_id!);
                    return `**${index + 1}.** ${user.toString()} - Niveau ${entry.level} (${entry.totalXp} XP total)`;
                } catch {
                    return `**${index + 1}.** *Utilisateur Inconnu* - Niveau ${entry.level} (${entry.totalXp} XP total)`;
                }
            }));
            
            const embed = new EmbedBuilder()
                .setColor(0xFFD700) // Gold
                .setTitle(`🏆 Classement de ${interaction.guild.name}`)
                .setDescription(leaderboardEntries.join('\n'))
                .setTimestamp()
                .setFooter({ text: `Demandé par ${interaction.user.tag}`});
                
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('[TopXPCommand] Error fetching leaderboard:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de la récupération du classement.' });
        }
    },
};

export default TopXPCommand;
