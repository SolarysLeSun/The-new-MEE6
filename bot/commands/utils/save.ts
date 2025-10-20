

import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, AttachmentBuilder, MessageFlags, Collection, GuildMember, Role } from 'discord.js';
import type { Command } from '@/types';
import { format } from 'date-fns';

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
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un salon de serveur.', ephemeral: true });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        const limit = interaction.options.getInteger('limit') || 100;

        try {
            const messages = await interaction.channel.messages.fetch({ limit });
            const sortedMessages = Array.from(messages.values()).reverse();
            
            const transcriptMessages = await Promise.all(sortedMessages.map(async (msg) => {
                const member = await interaction.guild!.members.fetch(msg.author.id).catch(() => null);
                const highestRole = member?.roles.highest;
                
                return {
                    id: msg.id,
                    content: msg.content,
                    author: {
                        id: msg.author.id,
                        username: msg.author.username,
                        displayName: member?.displayName || msg.author.username,
                        avatarURL: msg.author.displayAvatarURL(),
                        isBot: msg.author.bot,
                        roleColor: highestRole?.hexColor || '#FFFFFF'
                    },
                    timestamp: msg.createdAt.toISOString(),
                    embeds: msg.embeds.map(e => e.toJSON()),
                    attachments: msg.attachments.map(a => ({ name: a.name, url: a.url, proxyURL: a.proxyURL, size: a.size, contentType: a.contentType })),
                    replyTo: msg.reference?.messageId || null
                };
            }));

            const transcriptData = {
                server: {
                    name: interaction.guild.name,
                    iconURL: interaction.guild.iconURL(),
                },
                channel: {
                    name: 'name' in interaction.channel ? interaction.channel.name : 'Salon Inconnu',
                    topic: 'topic' in interaction.channel ? interaction.channel.topic : null,
                },
                generatedAt: new Date().toISOString(),
                messageCount: transcriptMessages.length,
                messages: transcriptMessages
            };
            
            const jsonString = JSON.stringify(transcriptData, null, 2);
            const attachment = new AttachmentBuilder(Buffer.from(jsonString), {
                name: `transcript-${interaction.channel.id}-${Date.now()}.json`,
            });
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('📄 Transcription Réussie')
                .setDescription(`La transcription JSON de **${messages.size}** messages du salon **#${'name' in interaction.channel ? interaction.channel.name : ''}** est prête. Glissez-déposez ce fichier dans le lecteur de transcriptions sur le panel pour le visualiser.`);
                
            await interaction.editReply({ embeds: [embed], files: [attachment] });

        } catch (error) {
            console.error('[SaveCommand] Error creating transcript:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de la création de la transcription.' });
        }
    },
};

export default SaveCommand;


    