

import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { patchNoteFlow } from '@/ai/flows/patchnote-flow';
import { getServerConfig, getGlobalAiStatus } from '@/lib/db';

const OWNER_ID = '556529963877138442';

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
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', ephemeral: true });
            return;
        }
        
        const globalAiStatus = getGlobalAiStatus();
        if (globalAiStatus.disabled) {
            await interaction.reply({ content: `Les fonctionnalités IA sont désactivées globalement. Raison : ${globalAiStatus.reason}`, ephemeral: true });
            return;
        }

        const isOfficial = interaction.options.getBoolean('officiel') ?? false;
        if (isOfficial && interaction.user.id !== OWNER_ID) {
             await interaction.reply({ content: "L'option 'officiel' est réservée au propriétaire du bot.", ephemeral: true });
            return;
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
                .setColor(isOfficial ? 0xFFD700 : 0x3498DB)
                .setTimestamp();

            await interaction.editReply({ 
                content: "Voici votre note de mise à jour, traitée par l'IA :",
                embeds: [embed]
            });

        } catch (error) {
            console.error('[PatchNoteCommand] Error:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors du traitement de votre texte.' });
        }
    },
};

export default PatchNoteCommand;
