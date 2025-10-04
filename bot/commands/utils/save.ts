

import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, AttachmentBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import fetch from 'node-fetch';

const TEMPLATE_URL = 'https://raw.githubusercontent.com/softpython2884/FlowUpBase/refs/heads/main/html';


const SaveCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('save')
        .setDescription('Sauvegarde la conversation du salon actuel dans un fichier HTML.')
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
        
        let templateHtml: string;
        try {
            const response = await fetch(TEMPLATE_URL);
            if (!response.ok) throw new Error(`Failed to fetch template: ${response.statusText}`);
            templateHtml = await response.text();
        } catch (error) {
            console.error('[SaveCommand] Error fetching transcript template:', error);
            await interaction.editReply({ content: 'Erreur : Impossible de charger le modèle de transcription. Veuillez contacter l\'administrateur du bot.', flags: MessageFlags.Ephemeral });
            return;
        }
        
        const limit = interaction.options.getInteger('limit') || 100;

        try {
            const messages = await interaction.channel.messages.fetch({ limit });
            const sortedMessages = Array.from(messages.values()).reverse();

            let transcriptContent = '';

            for (const msg of sortedMessages) {
                 const avatarUrl = msg.author.displayAvatarURL({ size: 128 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
                 const userTag = msg.author.tag;
                 const timestamp = formatDistanceToNow(msg.createdAt, { addSuffix: true, locale: fr });
                 
                 let messageBody = msg.content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                 if(msg.embeds.length > 0) {
                     messageBody += '<br><span style="color: #aaa;">[Contenu embarqué non affiché]</span>';
                 }
                 if(msg.attachments.size > 0) {
                     messageBody += '<br><span style="color: #aaa;">[Pièce jointe non affichée]</span>';
                 }

                 transcriptContent += `
                    <div class="chat-message">
                        <img class="avatar" src="${avatarUrl}" alt="Avatar">
                        <div class="message-content">
                            <span class="username">${userTag}</span>
                            <span class="timestamp">${timestamp}</span>
                            <div class="message-body">${messageBody || '<span style="color: #aaa;">[Message vide]</span>'}</div>
                        </div>
                    </div>
                 `;
            }

            const now = new Date();
            const serverName = interaction.guild.name;
            const channelName = 'name' in interaction.channel ? interaction.channel.name : 'Salon Inconnu';
            const serverIcon = interaction.guild.iconURL() || 'https://cdn.discordapp.com/embed/avatars/0.png';

            let finalHtml = templateHtml
                .replace('{server_name}', serverName)
                .replace('{channel_name}', channelName)
                .replace('{transcript_date}', format(now, 'dd/MM/yyyy \'à\' HH:mm'))
                .replace('{server_icon}', serverIcon)
                .replace('{transcript_content}', transcriptContent)
                .replace('{message_count}', messages.size.toString());


            const attachment = new AttachmentBuilder(Buffer.from(finalHtml), {
                name: `transcript-${channelName}-${Date.now()}.html`,
            });
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('📄 Transcription Réussie')
                .setDescription(`La transcription de **${messages.size}** messages du salon **#${channelName}** est prête.`);
                
            await interaction.editReply({ embeds: [embed], files: [attachment] });

        } catch (error) {
            console.error('[SaveCommand] Error creating transcript:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de la création de la transcription.' });
        }
    },
};

export default SaveCommand;
