

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import type { Command } from '@/types';

const NextUpdateCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('nextupdate')
        .setDescription('Affiche le lien vers la feuille de route des prochaines mises à jour.'),

    async execute(interaction: ChatInputCommandInteraction) {
        
        const roadmapUrl = process.env.PANEL_BASE_URL ? `${process.env.PANEL_BASE_URL}/roadmap` : "https://marcusbot.fr/roadmap";

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('🚀 Prochaines Mises à Jour')
            .setDescription("Curieux de savoir ce qui arrive sur Marcus ? Consultez notre feuille de route publique pour voir les prochaines fonctionnalités en cours de développement et celles à venir !")
            .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setLabel('Voir la Feuille de Route')
                .setURL(roadmapUrl)
                .setStyle(ButtonStyle.Link)
                .setEmoji('🗺️')
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    },
};

export default NextUpdateCommand;
