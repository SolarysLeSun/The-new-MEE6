
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, getReferralCode, applyReferral } from '@/lib/db';

const ParrainageCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('parrainage')
        .setDescription('Utilise un code de parrainage pour récompenser un autre serveur.')
        .addStringOption(option =>
            option.setName('code')
                .setDescription('Le code de parrainage du serveur que vous souhaitez soutenir.')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', flags: MessageFlags.Ephemeral });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        const config = await getServerConfig(interaction.guild.id, 'referral');
        if (!config?.enabled) {
            await interaction.reply({ content: 'Le système de parrainage est désactivé sur ce serveur.', flags: MessageFlags.Ephemeral });
            return;
        }

        const referralCode = interaction.options.getString('code', true);
        const referringGuildId = interaction.guild.id;
        const referringOwnerId = interaction.guild.ownerId;

        try {
            const result = await applyReferral(referralCode, referringGuildId, referringOwnerId, interaction.client);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🎉 Parrainage Réussi !')
                    .setDescription(result.message);
                
                await interaction.editReply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Échec du Parrainage')
                    .setDescription(result.message);

                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error: any) {
            console.error(`[Parrainage] Error applying referral:`, error);
            await interaction.editReply({ content: `Une erreur interne est survenue: ${error.message}` });
        }
    },
};

export default ParrainageCommand;
