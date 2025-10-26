
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { Command } from '../../../src/types';
import { getServerConfig } from '../../../src/lib/db';

const SetBotSuggestCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('setbotsuggest')
        .setDescription('Envoie le panneau de suggestions pour le bot dans un salon.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Le salon où envoyer le panneau. Par défaut, le salon actuel.')
                .setRequired(false)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', flags: MessageFlags.Ephemeral });
            return;
        }

        const config = await getServerConfig(interaction.guild.id, 'suggestions');
        if (!config?.enabled) {
            await interaction.reply({ content: "Le module de suggestions est désactivé sur ce serveur.", flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const targetChannel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;
        
        if (!targetChannel || !targetChannel.isTextBased()) {
            await interaction.editReply({ content: "Le salon spécifié n'est pas un salon textuel." });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('💡 Boîte à Idées pour Marcus')
            .setDescription('Vous avez une idée pour améliorer le bot Marcus ? Une nouvelle fonctionnalité, une correction à suggérer ?\nCliquez sur le bouton ci-dessous pour l\'envoyer directement à son développeur !')
            .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() || undefined });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('create_bot_suggestion')
                .setLabel('Suggérer une amélioration pour le bot')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('💡')
        );

        try {
            await targetChannel.send({ embeds: [embed], components: [row] });
            await interaction.editReply({ content: `✅ Le panneau de suggestions pour le bot a été envoyé avec succès dans ${targetChannel}.` });
        } catch (error) {
            console.error('[SetBotSuggest] Error sending bot suggestion panel:', error);
            await interaction.editReply({ content: 'Une erreur est survenue. Vérifiez que j\'ai bien les permissions d\'envoyer des messages dans ce salon.' });
        }
    },
};

export default SetBotSuggestCommand;
