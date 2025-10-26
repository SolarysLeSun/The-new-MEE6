
import { SlashCommandBuilder, ChatInputCommandInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig } from '@/lib/db';

const EmbedCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Crée un message embed simple via un formulaire.'),

    async execute(interaction: ChatInputCommandInteraction) {
        const config = getServerConfig(interaction.guildId!, 'embed-builder');
        if (!config?.enabled) {
            await interaction.reply({ content: "Le module de création d'embeds est désactivé sur ce serveur.", ephemeral: true });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId('simple_embed_modal')
            .setTitle("Créateur d'Embed Simple");

        const contentInput = new TextInputBuilder()
            .setCustomId('embed_content')
            .setLabel("Contenu du message (hors de l'embed)")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        const titleInput = new TextInputBuilder()
            .setCustomId('embed_title')
            .setLabel("Titre de l'embed")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('embed_description')
            .setLabel("Description de l'embed")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);
        
        const footerInput = new TextInputBuilder()
            .setCustomId('embed_footer')
            .setLabel("Pied de page (footer) de l'embed")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const imageAndColorRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
             new TextInputBuilder()
                .setCustomId('embed_image_url')
                .setLabel("URL de l'image")
                .setStyle(TextInputStyle.Short)
                .setRequired(false),
        );
        
        const colorInput = new TextInputBuilder()
            .setCustomId('embed_color')
            .setLabel("Couleur (Hex: #ffffff)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);


        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(contentInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(footerInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(colorInput),
            // The image input needs its own row due to Discord limitations
        );
         const imageInputRow = new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('embed_image_url').setLabel("URL de l'image").setStyle(TextInputStyle.Short).setRequired(false));


        await interaction.showModal(modal);
    },
};

export default EmbedCommand;
