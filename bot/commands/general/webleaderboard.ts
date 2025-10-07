
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig } from '@/lib/db';

const WebLeaderboardCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('webleaderboard')
        .setDescription('Affiche le lien vers le classement web complet du serveur.'),

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
        
        const panelUrl = process.env.PANEL_BASE_URL || 'http://localhost:9002';
        const leaderboardUrl = `${panelUrl}/scoreboard/level/${interaction.guild.id}`;

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle(`🏆 Classement de ${interaction.guild.name}`)
            .setDescription("Consultez le classement complet en temps réel sur notre panel web !");
            
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setLabel('Voir le classement')
                .setStyle(ButtonStyle.Link)
                .setURL(leaderboardUrl)
                .setEmoji('🔗')
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    },
};

export default WebLeaderboardCommand;
