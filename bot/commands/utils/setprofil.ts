
import { SlashCommandBuilder, ChatInputCommandInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig } from '@/lib/db';

const SetProfilCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('setprofil')
        .setDescription('Définit ou met à jour votre biographie et vos liens de profil.'),

    async execute(interaction: ChatInputCommandInteraction) {
        const config = getServerConfig(interaction.guildId!, 'utils');
        if (!config?.command_enabled?.setprofil) {
            await interaction.reply({ content: "Cette commande est désactivée sur ce serveur.", ephemeral: true });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId('setprofil_modal')
            .setTitle('Modifier votre Profil');

        const bioInput = new TextInputBuilder()
            .setCustomId('profile_bio')
            .setLabel("Votre biographie")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Décrivez-vous en quelques mots...")
            .setRequired(false)
            .setMaxLength(1024);

        const linksInput = new TextInputBuilder()
            .setCustomId('profile_links')
            .setLabel("Vos liens (1 par ligne)")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Format : Titre du lien | https://exemple.com\nEx: Mon Twitter | https://twitter.com/...")
            .setRequired(false);
            
        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(bioInput), 
            new ActionRowBuilder<TextInputBuilder>().addComponents(linksInput)
        );

        await interaction.showModal(modal);
    },
};

export default SetProfilCommand;
