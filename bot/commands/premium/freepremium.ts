
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, setPremiumStatus } from '@/lib/db';
import ms from 'ms';

const FreePremiumCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('freepremium')
        .setDescription('Réclamez 24h de premium gratuit pour votre serveur (disponible le 10 de chaque mois).'),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', ephemeral: true });
            return;
        }

        const today = new Date();
        if (today.getDate() !== 10) {
            await interaction.reply({ content: "Cette commande n'est disponible que le 10 de chaque mois. Revenez plus tard !", ephemeral: true });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });

        const config = getServerConfig(interaction.guild.id, 'premium'); // Use a placeholder module
        if (!config) {
             await interaction.editReply({ content: 'Impossible de vérifier le statut premium actuel du serveur.' });
             return;
        }

        if (config.premium && !config.premium_expires_at) {
             await interaction.editReply({ content: 'Ce serveur bénéficie déjà du statut Premium permanent. Vous ne pouvez pas utiliser cette commande.' });
             return;
        }

        const now = new Date();
        const currentExpiry = config.premium_expires_at ? new Date(config.premium_expires_at) : now;
        
        // If already premium, extend it. Otherwise, start from now.
        const startDate = currentExpiry > now ? currentExpiry : now;
        const newExpiry = new Date(startDate.getTime() + ms('24h'));

        try {
            setPremiumStatus(interaction.guild.id, true, newExpiry);

            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('🎉 Premium Mensuel Activé !')
                .setDescription(`Votre serveur bénéficie désormais des avantages Premium ! Ce bonus expirera <t:${Math.floor(newExpiry.getTime() / 1000)}:R>.`)
                .setFooter({ text: 'Merci de votre fidélité !' });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('[FreePremium] Error activating monthly premium:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de l\'activation du premium gratuit.' });
        }
    },
};

export default FreePremiumCommand;
