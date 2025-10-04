
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '@/types';

const ServerCloneCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('server-clone')
        .setDescription('Permet de cloner la structure d\'un serveur (Fonctionnalité Externe).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('Fonctionnalité Externe : Clonage de Serveur')
            .setDescription(
                'Le clonage de serveur est une opération complexe et potentiellement dangereuse, gérée par un **bot Marcus dédié** pour garantir la sécurité et la performance.\n\n' +
                'Pour utiliser cette fonctionnalité, veuillez inviter le bot de clonage depuis notre site web ou serveur de support.\n\n' +
                'Cette approche garantit que les opérations lourdes n\'impactent pas les performances de votre bot principal.'
            )
            .setFooter({ text: 'Merci de votre compréhension !' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};

export default ServerCloneCommand;
