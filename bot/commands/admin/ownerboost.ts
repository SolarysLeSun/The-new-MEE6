
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { setOwnerXPBoost } from '@/lib/db';

const OWNER_ID = '556529963877138442';

const OwnerBoostCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('ownerboost')
        .setDescription('Définit un multiplicateur d\'XP personnel. (Propriétaire seulement)')
        .setDMPermission(true)
        .addNumberOption(option =>
            option.setName('multiplicateur')
                .setDescription('Le multiplicateur d\'XP (ex: 2 pour un boost x2). Mettre 1 pour normal.')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(10)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID) {
            await interaction.reply({ content: 'Cette commande est exclusivement réservée au propriétaire du bot.', flags: MessageFlags.Ephemeral });
            return;
        }

        const multiplier = interaction.options.getNumber('multiplicateur', true);

        try {
            setOwnerXPBoost(multiplier);

            const embed = new EmbedBuilder()
                .setColor(multiplier > 1 ? 0x00FF00 : 0x00BFFF)
                .setTitle('Boost d\'XP Propriétaire Modifié')
                .setDescription(`Votre multiplicateur d'XP personnel a été défini sur **x${multiplier}**.`);

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('[OwnerBoostCommand] Error:', error);
            await interaction.reply({ content: 'Une erreur est survenue lors de la définition du boost d\'XP.' });
        }
    },
};

export default OwnerBoostCommand;
