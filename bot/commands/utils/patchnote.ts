

import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, TextChannel } from 'discord.js';
import type { Command } from '@/types';
import { patchNoteFlow } from '@/ai/flows/patchnote-flow';
import { getServerConfig, getGlobalAiStatus } from '@/lib/db';

const OWNER_ID = '556529963877138442';
const WEBHOOK_NAME = "Marcus";

const PatchNoteCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('patchnote')
        .setDescription("Fait corriger ou améliorer un texte de note de mise à jour par l'IA.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('texte')
                .setDescription('Le texte brut de votre note de mise à jour.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('mode')
                .setDescription("Le type de traitement par l'IA.")
                .setRequired(true)
                .addChoices(
                    { name: 'Correction Simple (Orthographe & Grammaire)', value: 'simple' },
                    { name: 'Amélioration IA (Reformulation & Mise en page)', value: 'upgrade' }
                ))
        .addBooleanOption(option =>
            option.setName('officiel')
                .setDescription("Marquer comme une annonce officielle (Propriétaire seulement).")
                .setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        const globalAiStatus = getGlobalAiStatus();
        if (globalAiStatus.disabled) {
            await interaction.reply({ content: `Les fonctionnalités IA sont désactivées globalement. Raison : ${globalAiStatus.reason}`, ephemeral: true });
            return;
        }

        let isOfficial = interaction.options.getBoolean('officiel') ?? false;
        // Force 'isOfficial' to false if the user is not the owner
        if (isOfficial && interaction.user.id !== OWNER_ID) {
             isOfficial = false;
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        const rawText = interaction.options.getString('texte', true);
        const mode = interaction.options.getString('mode', true) as 'simple' | 'upgrade';

        try {
            const result = await patchNoteFlow({
                rawText,
                authorName: interaction.user.tag,
                isOfficial,
                mode,
            });

            const embed = new EmbedBuilder()
                .setTitle(`📝 ${result.title}`)
                .setAuthor({ name: result.author })
                .setDescription(result.content)
                .setColor(isOfficial ? 0xFFD700 : 0xf37349)
                .setTimestamp();
            
            // Si la commande est lancée sur un serveur et dans un salon textuel
            if (interaction.inGuild() && interaction.channel && interaction.channel.isTextBased()) {
                const identityConfig = await getServerConfig(interaction.guild.id, 'server-identity');
                if (identityConfig?.enabled) {
                    const webhooks = await (interaction.channel as TextChannel).fetchWebhooks();
                    let webhook = webhooks.find(wh => wh.name === WEBHOOK_NAME && wh.token !== null);

                    if (!webhook) {
                        webhook = await (interaction.channel as TextChannel).createWebhook({
                            name: WEBHOOK_NAME,
                            avatar: identityConfig.avatar_url || interaction.client.user?.displayAvatarURL(),
                            reason: 'Webhook pour les annonces et patchnotes'
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
                
                await interaction.editReply({ 
                    content: `✅ Votre note de mise à jour a été générée et publiée dans ${interaction.channel}.`,
                });

            } else {
                // Si la commande est lancée en DM, on envoie l'embed en réponse
                await interaction.editReply({ embeds: [embed] });
            }


        } catch (error) {
            console.error('[PatchNoteCommand] Error:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors du traitement de votre texte.' });
        }
    },
};

export default PatchNoteCommand;
