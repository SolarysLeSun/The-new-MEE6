
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, AttachmentBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';

const SaveCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('save')
        .setDescription('Sauvegarde la conversation du salon actuel dans un fichier JSON.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Nombre de messages à sauvegarder (1-100). Défaut : 100.')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.channel || !interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un salon de serveur.', flags: MessageFlags.Ephemeral });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        const limit = interaction.options.getInteger('limit') || 100;

        try {
            const messages = await interaction.channel.messages.fetch({ limit });
            const sortedMessages = Array.from(messages.values()).reverse();

            const transcriptData = {
                server: {
                    name: interaction.guild.name,
                    iconURL: interaction.guild.iconURL()
                },
                channel: {
                    name: 'name' in interaction.channel ? interaction.channel.name : 'Salon Inconnu',
                    topic: 'topic' in interaction.channel ? interaction.channel.topic : null
                },
                generatedAt: new Date().toISOString(),
                messageCount: sortedMessages.length,
                messages: sortedMessages.map(msg => ({
                    id: msg.id,
                    content: msg.content,
                    author: {
                        id: msg.author.id,
                        username: msg.author.username,
                        displayName: msg.member?.displayName || msg.author.username,
                        avatarURL: msg.author.displayAvatarURL(),
                        isBot: msg.author.bot,
                        roleColor: msg.member?.displayHexColor || '#FFFFFF'
                    },
                    timestamp: msg.createdAt.toISOString(),
                    embeds: msg.embeds.map(embed => embed.toJSON()),
                    attachments: msg.attachments.map(att => ({ url: att.url, name: att.name, contentType: att.contentType })),
                    replyTo: msg.reference?.messageId || null,
                }))
            };

            const transcriptString = JSON.stringify(transcriptData, null, 2);

            const attachment = new AttachmentBuilder(Buffer.from(transcriptString), {
                name: `transcript-${transcriptData.channel.name}-${Date.now()}.json`,
            });
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('📄 Transcription Réussie')
                .setDescription(`La transcription de **${transcriptData.messageCount}** messages du salon **#${transcriptData.channel.name}** est prête. Déposez ce fichier dans le "Lecteur de Transcriptions" sur le panel web pour le visualiser.`)
                .setFooter({ text: "Ce fichier contient les données brutes de la conversation." });
                
            await interaction.editReply({ embeds: [embed], files: [attachment] });

        } catch (error) {
            console.error('[SaveCommand] Error creating transcript:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de la création de la transcription.' });
        }
    },
};

export default SaveCommand;
