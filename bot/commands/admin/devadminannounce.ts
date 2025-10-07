
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, TextChannel, Client, SystemChannelFlagsBitField, SystemChannelFlags, APIPartialChannel, User, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, getDevGuilds } from '@/lib/db';
import { announcementFlow } from '@/ai/flows/announcement-flow';

const OWNER_ID = '556529963877138442';

const DevAdminAnnounceCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('devadminannounce')
        .setDescription('Envoie une annonce aux serveurs de dev/support. (Propriétaire seulement)')
        .setDMPermission(true)
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Le contenu de l\'annonce à envoyer.')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('use_ia')
                .setDescription('Mettre en forme le message avec l\'IA ? (Oui par défaut)')
                .setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID) {
            await interaction.reply({ content: 'Cette commande est réservée au propriétaire du bot.', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });
        
        const rawText = interaction.options.getString('message', true);
        const useIA = interaction.options.getBoolean('use_ia') ?? true;
        const client = interaction.client;

        let title = 'Annonce de Développement';
        let description = rawText;

        if (useIA) {
            try {
                const result = await announcementFlow({
                    rawText,
                    authorName: interaction.user.username,
                });
                title = result.title;
                description = result.description;
            } catch (error) {
                console.error('[DevAdminAnnounce] Erreur de l\'IA, envoi du texte brut.', error);
                await interaction.editReply({ content: `⚠️ L'IA a échoué. Le message brut sera envoyé.` });
            }
        }

        const devGuilds = getDevGuilds();

        const embed = new EmbedBuilder()
            .setAuthor({ name: rawText })
            .setTitle(title)
            .setDescription(description)
            .setColor(0x3498DB) // Blue
            .setFooter({ text: `Annonce de dev de la part de ${client.user?.username} | dev_admin_announce`, iconURL: client.user?.displayAvatarURL() || undefined })
            .setTimestamp();
        
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('publish_dev_content')
                .setLabel(`Publier sur ${devGuilds.length} serveurs`)
                .setStyle(ButtonStyle.Success)
                .setEmoji('🚀'),
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
            content: `Voici un aperçu de votre annonce de dev. Elle sera envoyée à **${devGuilds.length}** serveur(s) configuré(s). Confirmez-vous l'envoi ?`,
            embeds: [embed],
            components: [row]
        });
    },
};

export default DevAdminAnnounceCommand;
