
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { resetGuildXP } from '@/lib/db';

const ResetXPCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('resetxp')
        .setDescription("Réinitialise TOUTE l'XP et les niveaux pour ce serveur.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('⚠️ Confirmation de Réinitialisation ⚠️')
            .setDescription(`Êtes-vous absolument certain de vouloir réinitialiser **toute l'expérience et tous les niveaux** pour tous les membres de ce serveur ?\n\n**Cette action est irréversible.**`);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('confirm_reset_xp').setLabel('Oui, tout réinitialiser').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('cancel_reset_xp').setLabel('Annuler').setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },
};

export default ResetXPCommand;
