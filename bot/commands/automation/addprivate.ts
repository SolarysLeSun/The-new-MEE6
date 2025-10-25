

import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { Command } from '../../../src/types';
import { getServerConfig } from '../../../src/lib/db';

const AddPrivateCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('addticket')
        .setDescription('Envoie le panneau de création de ticket dans le salon configuré.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', flags: MessageFlags.Ephemeral });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });

        const privateRoomsConfig = await getServerConfig(interaction.guild.id, 'private-rooms');

        if (!privateRoomsConfig?.enabled) {
            await interaction.editReply({ content: "Le module de tickets est désactivé sur ce serveur." });
            return;
        }
        
        if (!privateRoomsConfig.creation_channel) {
            await interaction.editReply({ content: "Aucun salon de création n'a été configuré. Veuillez le définir dans le dashboard." });
            return;
        }
        
        try {
            const channel = await interaction.guild.channels.fetch(privateRoomsConfig.creation_channel) as TextChannel;
            if (!channel) {
                await interaction.editReply({ content: "Le salon de création configuré n'existe plus." });
                return;
            }

            const embed = new EmbedBuilder()
                .setColor(0xf37349)
                .setTitle(privateRoomsConfig.modal_title || 'Ouvrir un ticket')
                .setDescription(privateRoomsConfig.embed_message || 'Cliquez sur le bouton ci-dessous pour ouvrir un ticket.')
                .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() || undefined });

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('create_private_room')
                    .setLabel('Ouvrir un ticket')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕')
            );
            
            await channel.send({ embeds: [embed], components: [row] });

            await interaction.editReply({ content: `✅ Le panneau de création de ticket a été envoyé avec succès dans ${channel}.` });

        } catch (error) {
            console.error('[AddPrivate] Error sending ticket panel:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de l\'envoi du panneau.' });
        }
    },
};

export default AddPrivateCommand;
