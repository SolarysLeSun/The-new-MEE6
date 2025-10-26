
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, canClaimDaily, recordDailyClaim, updateUserXP } from '@/lib/db';

const MIN_XP = 150;
const MAX_XP = 750;

const JournalierCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('journalier')
        .setDescription('Réclame votre récompense journalière en XP.'),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande doit être utilisée dans un serveur.', ephemeral: true });
            return;
        }

        const config = await getServerConfig(interaction.guild.id, 'leveling');
        if (!config?.enabled) {
            await interaction.reply({ content: 'Le système de niveaux est désactivé sur ce serveur.', ephemeral: true });
            return;
        }

        const { canClaim, timeRemaining } = canClaimDaily(interaction.guild.id, interaction.user.id);

        if (!canClaim) {
            const embed = new EmbedBuilder()
                .setColor(0xFFCC00)
                .setTitle('Récompense déjà réclamée')
                .setDescription(`Vous avez déjà réclamé votre récompense aujourd'hui. Veuillez patienter.\nProchaine réclamation possible dans **${timeRemaining}**.`);
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        const xpGained = Math.floor(Math.random() * (MAX_XP - MIN_XP + 1)) + MIN_XP;

        try {
            updateUserXP(interaction.user.id, interaction.guild.id, xpGained, 'add');
            recordDailyClaim(interaction.guild.id, interaction.user.id);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🎉 Récompense Journalière Réclamée ! 🎉')
                .setDescription(`Vous avez reçu **${xpGained.toLocaleString()} XP** ! Revenez demain pour une nouvelle récompense.`);
            
            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('[JournalierCommand] Error:', error);
            await interaction.reply({ content: 'Une erreur est survenue lors de la réclamation de votre récompense.', ephemeral: true });
        }
    },
};

export default JournalierCommand;
