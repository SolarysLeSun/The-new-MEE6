
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { getOrCreateReferralCode, getGuildIdByReferralCode, recordReferral, getUniqueReferralCount, hasBeenReferred, setPremiumStatus } from '@/lib/db';

const REFERRAL_REWARD_THRESHOLD = 10;

const ReferralCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('parrainage')
        .setDescription('Gère le système de parrainage du serveur.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('code')
                .setDescription('Affiche le code de parrainage de ce serveur.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('utiliser')
                .setDescription('Utilise un code de parrainage pour créditer un autre serveur.')
                .addStringOption(option =>
                    option.setName('code')
                        .setDescription('Le code de parrainage du serveur qui vous a invité.')
                        .setRequired(true))),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', flags: MessageFlags.Ephemeral });
            return;
        }

        const subcommand = interaction.options.getSubcommand();
        await interaction.deferReply({ ephemeral: true });

        if (subcommand === 'code') {
            const referralCode = getOrCreateReferralCode(interaction.guild.id);
            const referralCount = getUniqueReferralCount(interaction.guild.id);

            const embed = new EmbedBuilder()
                .setColor(0xFF7300)
                .setTitle(`🔗 Votre Code de Parrainage`)
                .setDescription(`Partagez ce code avec d'autres administrateurs de serveurs pour gagner des récompenses !`)
                .addFields(
                    { name: 'Votre Code', value: `\`\`\`${referralCode}\`\`\`` },
                    { name: 'Parrainages Validés', value: `**${referralCount}** / ${REFERRAL_REWARD_THRESHOLD}`, inline: true },
                    { name: 'Prochaine Récompense', value: '1 mois de Premium', inline: true }
                );
            await interaction.editReply({ embeds: [embed] });

        } else if (subcommand === 'utiliser') {
            // Permission check: Only server owner can use a referral code
            if (interaction.user.id !== interaction.guild.ownerId) {
                await interaction.editReply({ content: 'Seul le propriétaire du serveur peut utiliser un code de parrainage.', flags: MessageFlags.Ephemeral });
                return;
            }

            // Check if this server has already been referred
            if (hasBeenReferred(interaction.guild.id)) {
                await interaction.editReply({ content: 'Ce serveur a déjà été parrainé et ne peut pas utiliser un autre code.', flags: MessageFlags.Ephemeral });
                return;
            }

            const code = interaction.options.getString('code', true).toUpperCase();
            const referrerGuildId = getGuildIdByReferralCode(code);

            if (!referrerGuildId) {
                await interaction.editReply({ content: 'Ce code de parrainage est invalide.', flags: MessageFlags.Ephemeral });
                return;
            }

            if (referrerGuildId === interaction.guild.id) {
                await interaction.editReply({ content: 'Vous ne pouvez pas parrainer votre propre serveur.', flags: MessageFlags.Ephemeral });
                return;
            }

            try {
                recordReferral(referrerGuildId, interaction.guild.id, interaction.guild.ownerId);
                
                await interaction.editReply({ content: `<:Oui:1421563353888723084> Merci ! Le serveur parrain a bien été crédité.`, flags: MessageFlags.Ephemeral });

                // Check for reward
                const newReferralCount = getUniqueReferralCount(referrerGuildId);

                if (newReferralCount > 0 && newReferralCount % REFERRAL_REWARD_THRESHOLD === 0) {
                    const referrerGuild = await interaction.client.guilds.fetch(referrerGuildId).catch(() => null);
                    if (referrerGuild) {
                        // TODO: Implement a robust premium extension system.
                        // For now, we grant premium status if it's not already active.
                        setPremiumStatus(referrerGuildId, true);
                        const referrerOwner = await referrerGuild.fetchOwner();
                        const rewardEmbed = new EmbedBuilder()
                             .setColor(0xFFD700)
                             .setTitle('🎉 Récompense de Parrainage Débloquée ! 🎉')
                             .setDescription(`Félicitations ! Vous avez atteint un nouveau palier de parrainage (**${newReferralCount}** parrainages uniques) et gagné **1 mois de Premium** !`)
                             .setFooter({ text: `Récompense pour le serveur ${referrerGuild.name}`});
                        
                        await referrerOwner.send({ embeds: [rewardEmbed] }).catch(e => {
                            console.warn(`[Referral] Could not send reward DM to owner of ${referrerGuild.name}`);
                        });
                    }
                }
            } catch (error: any) {
                 if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    await interaction.editReply({ content: 'Une erreur est survenue. Il est possible que ce serveur ait déjà été parrainé par cette même personne sur un autre serveur.', flags: MessageFlags.Ephemeral });
                 } else {
                    console.error('[Referral] Error recording referral:', error);
                    await interaction.editReply({ content: 'Une erreur interne est survenue.', flags: MessageFlags.Ephemeral });
                }
            }
        }
    },
};

export default ReferralCommand;
