
import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, EmbedBuilder } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, getGuildLeaderboard } from '@/lib/db';

const TopLevelCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('toplevel')
        .setDescription('Affiche un podium des 3 meilleurs utilisateurs du serveur.'),

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
            const leaderboard = getGuildLeaderboard(interaction.guild.id, 3);
            
            if (leaderboard.length === 0) {
                await interaction.editReply({ content: 'Aucune donnée de niveau disponible pour ce serveur.' });
                return;
            }

            const cardUrl = new URL(`${process.env.PANEL_BASE_URL}/card/toplevel/${interaction.guild.id}`);
            cardUrl.searchParams.append('serverName', interaction.guild.name);

            leaderboard.forEach((entry, index) => {
                const rank = index + 1;
                cardUrl.searchParams.append(`user${rank}_displayName`, entry.user?.username || 'Utilisateur inconnu');
                cardUrl.searchParams.append(`user${rank}_username`, entry.user?.username || 'Utilisateur inconnu');
                cardUrl.searchParams.append(`user${rank}_avatarUrl`, entry.user?.displayAvatarURL({ extension: 'png', size: 256 }) || '');
                cardUrl.searchParams.append(`user${rank}_level`, entry.level.toString());
            });

            if (config.level_card_background_url) {
                 cardUrl.searchParams.append('backgroundUrl', config.level_card_background_url);
            }

            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle(`🏆 Podium de ${interaction.guild.name}`)
                .setImage(cardUrl.toString())
                .setTimestamp();
                
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('[TopLevelCommand] Error fetching leaderboard or generating card:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de la création du podium.' });
        }
    },
};

export default TopLevelCommand;
