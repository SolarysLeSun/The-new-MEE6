
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, TextChannel, Client, SystemChannelFlagsBitField, SystemChannelFlags, APIPartialChannel, User, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, getAllBotServers, getGlobalAiStatus } from '@/lib/db';
import { announcementFlow } from '@/ai/flows/announcement-flow';

const OWNER_ID = '556529963877138442';

const AdminAnnounceCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('adminannounce')
        .setDescription('Envoie une annonce à tous les serveurs. (Propriétaire seulement)')
        .setDMPermission(true)
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Le contenu de l\'annonce à envoyer.')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('use_ia')
                .setDescription('Mettre en forme le message avec l\'IA ? (Oui par défaut)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('langue')
                .setDescription('Traduire l\'annonce dans une langue spécifique ? (Optionnel)')
                .setRequired(false)
                 .addChoices(
                    { name: 'Anglais', value: 'English' },
                    { name: 'Français', value: 'French' },
                    { name: 'Espagnol', value: 'Spanish' }
                )),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID) {
            await interaction.reply({ content: 'Cette commande est réservée au propriétaire du bot.', ephemeral: true });
            return;
        }
        
        const globalAiStatus = getGlobalAiStatus();
        if (globalAiStatus.disabled) {
            await interaction.reply({ content: `Les fonctionnalités IA sont désactivées globalement. Raison : ${globalAiStatus.reason}`, ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });
        
        const rawText = interaction.options.getString('message', true);
        const useIA = interaction.options.getBoolean('use_ia') ?? true;
        const targetLanguage = interaction.options.getString('langue');
        const client = interaction.client;

        let title = 'Annonce Importante';
        let description = rawText;

        if (useIA) {
            try {
                const result = await announcementFlow({
                    rawText,
                    authorName: interaction.user.username,
                    targetLanguage: targetLanguage || undefined,
                });
                title = result.title;
                description = result.description;
            } catch (error) {
                console.error('[AdminAnnounce] Erreur de l\'IA, envoi du texte brut.', error);
                await interaction.editReply({ content: `⚠️ L'IA a échoué. Le message brut sera envoyé.` });
            }
        }

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(0x5865F2)
            .setFooter({ text: `Annonce de la part de l'équipe de ${client.user?.username} | admin_announce`, iconURL: client.user?.displayAvatarURL() || undefined })
            .setTimestamp();
        
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('publish_content')
                .setLabel('Publier sur tous les serveurs')
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
            content: "Voici un aperçu de votre annonce. Confirmez-vous l'envoi ?",
            embeds: [embed],
            components: [row]
        });
    },
};

export default AdminAnnounceCommand;
