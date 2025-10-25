
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig } from '@/lib/db';
import { announcementFlow } from '@/ai/flows/announcement-flow';

const AnnounceCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Crée et publie une annonce dans le salon configuré.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Le contenu de votre annonce (sera mis en forme par l\'IA).')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', flags: MessageFlags.Ephemeral });
            return;
        }

        const config = await getServerConfig(interaction.guild.id, 'announcements');
        if (!config?.enabled) {
            await interaction.reply({ content: "Le module d'annonces est désactivé sur ce serveur.", flags: MessageFlags.Ephemeral });
            return;
        }
        if (!config.announcement_channel_id) {
            await interaction.reply({ content: "Aucun salon d'annonce n'a été configuré. Veuillez le faire dans le panel.", flags: MessageFlags.Ephemeral });
            return;
        }

        const targetChannel = await interaction.guild.channels.fetch(config.announcement_channel_id).catch(() => null) as TextChannel;
        if (!targetChannel) {
            await interaction.reply({ content: "Le salon d'annonce configuré n'existe plus.", flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const rawText = interaction.options.getString('message', true);

        try {
            const result = await announcementFlow({
                rawText: rawText,
                authorName: interaction.user.username,
            });

            const embed = new EmbedBuilder()
                .setColor(0xf37349)
                .setTitle(result.title)
                .setDescription(result.description)
                .setAuthor({ name: rawText }) // Store original raw text here
                .setTimestamp()
                .setFooter({ text: `announce_channel:${config.announcement_channel_id}` });


            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('publish_content')
                    .setLabel('Publier')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('<:Oui:1421563353888723084>'),
                new ButtonBuilder()
                    .setCustomId('modify_content')
                    .setLabel('Modifier')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('<:Option:1421563335094042796>'),
                new ButtonBuilder()
                    .setCustomId('cancel_content')
                    .setLabel('Annuler')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('<:Non:1421563259537850471>')
            );
            
            await interaction.editReply({
                content: "Voici un aperçu de votre annonce. Confirmez-vous la publication ?",
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            console.error('[AnnounceCommand] Error:', error);
            await interaction.editReply({ content: "Une erreur est survenue lors de la création de l'annonce." });
        }
    },
};

export default AnnounceCommand;
