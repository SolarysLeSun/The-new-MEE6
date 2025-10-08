
import { ContextMenuCommandBuilder, ApplicationCommandType, MessageContextMenuCommandInteraction, PermissionFlagsBits, EmbedBuilder, TextChannel } from 'discord.js';
import type { Command } from '@/types';
import { patchNoteFlow } from '@/ai/flows/patchnote-flow';
import { getServerConfig } from '@/lib/db';

const WEBHOOK_NAME = "Marcus";

const TransformToPatchnoteCommand: Command = {
    data: new ContextMenuCommandBuilder()
        .setName('Transformer en Patchnote')
        .setType(ApplicationCommandType.Message)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: MessageContextMenuCommandInteraction) {
        if (!interaction.guild || !interaction.channel || !(interaction.channel instanceof TextChannel) || !interaction.targetMessage.content) {
            await interaction.reply({ content: "Cette action n'est possible que sur un message contenant du texte.", ephemeral: true });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });

        const rawText = interaction.targetMessage.content;

        try {
            const result = await patchNoteFlow({
                rawText,
                authorName: interaction.user.tag,
                isOfficial: false,
                mode: 'upgrade',
            });

            const embed = new EmbedBuilder()
                .setTitle(`📝 ${result.title}`)
                .setAuthor({ name: result.author })
                .setDescription(result.content)
                .setColor(0x3498DB)
                .setTimestamp();
            
            const identityConfig = await getServerConfig(interaction.guild.id, 'server-identity');
            if (identityConfig?.enabled) {
                const webhooks = await (interaction.channel as TextChannel).fetchWebhooks();
                let webhook = webhooks.find(wh => wh.name === WEBHOOK_NAME && wh.token !== null);

                if (!webhook) {
                    webhook = await (interaction.channel as TextChannel).createWebhook({
                        name: WEBHOOK_NAME,
                        avatar: identityConfig.avatar_url || interaction.client.user?.displayAvatarURL(),
                        reason: 'Webhook pour les patchnotes'
                    });
                }
                
                await webhook.send({
                    username: identityConfig.nickname || interaction.client.user?.username,
                    avatarURL: identityConfig.avatar_url || interaction.client.user?.displayAvatarURL(),
                    embeds: [embed]
                });
            } else {
                await interaction.channel.send({ embeds: [embed] });
            }

            await interaction.editReply({ content: "✅ Note de mise à jour générée et publiée !" });

        } catch (error) {
            console.error('[TransformPatchnote] Error:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors du traitement de votre texte.' });
        }
    },
};

export default TransformToPatchnoteCommand;
