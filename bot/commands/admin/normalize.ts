
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, GuildMember } from 'discord.js';
import type { Command } from '@/types';

// Fonction pour normaliser les noms d'utilisateur
function normalizeUsername(name: string): string {
    return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x00-\x7F]/g, '');
}

const NormalizeCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('normalize')
        .setDescription('Normalise les pseudos pour enlever les caractères spéciaux.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Normalise le pseudo d\'un utilisateur spécifique.')
                .addUserOption(option =>
                    option.setName('utilisateur')
                        .setDescription('L\'utilisateur à normaliser.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('all')
                .setDescription('Normalise le pseudo de tous les membres non-administrateurs.')),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', ephemeral: true });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'user') {
            await interaction.deferReply({ ephemeral: true });
            const member = interaction.options.getMember('utilisateur') as GuildMember;
            if (!member) {
                await interaction.editReply({ content: 'Impossible de trouver cet utilisateur.' });
                return;
            }

            const oldNickname = member.displayName;
            const newNickname = normalizeUsername(oldNickname);

            if (oldNickname === newNickname) {
                await interaction.editReply({ content: `Le pseudo de **${oldNickname}** est déjà normalisé.` });
                return;
            }

            try {
                await member.setNickname(newNickname, `Normalisé par ${interaction.user.tag}`);
                await interaction.editReply(`✅ Le pseudo de **${oldNickname}** a été normalisé en **${newNickname}**.`);
            } catch (error) {
                console.error(error);
                await interaction.editReply({ content: "Je n'ai pas pu changer le pseudo de cet utilisateur. Vérifiez mes permissions et la hiérarchie des rôles." });
            }

        } else if (subcommand === 'all') {
            const embed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('Confirmation de Normalisation de Masse')
                .setDescription(`Êtes-vous sûr de vouloir normaliser les pseudos de **tous les membres** (sauf administrateurs) ? Cette action peut être longue et irréversible.`);

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('confirm_normalize_all').setLabel('Confirmer').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_normalize_all').setLabel('Annuler').setStyle(ButtonStyle.Secondary)
            );

            const confirmationMessage = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true, fetchReply: true });

            const collector = confirmationMessage.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 30000,
            });

            collector.on('collect', async i => {
                if (i.customId === 'confirm_normalize_all') {
                    await i.update({ content: 'Normalisation en cours...', embeds: [], components: [] });
                    
                    try {
                        const members = await interaction.guild!.members.fetch();
                        const membersToNormalize = members.filter(m => 
                            !m.permissions.has(PermissionFlagsBits.Administrator) &&
                            m.displayName !== normalizeUsername(m.displayName)
                        );
                        
                        let successCount = 0;
                        for (const member of membersToNormalize.values()) {
                            try {
                                await member.setNickname(normalizeUsername(member.displayName), `Normalisation de masse par ${interaction.user.tag}`);
                                successCount++;
                            } catch (err) {
                                console.warn(`Impossible de normaliser le pseudo de ${member.user.tag}`);
                            }
                        }
                        await i.followUp({ content: `✅ ${successCount} pseudos sur ${membersToNormalize.size} ont été normalisés.`, ephemeral: true });
                    } catch (error) {
                         await i.followUp({ content: "Une erreur est survenue lors de la récupération des membres.", ephemeral: true });
                    }

                } else {
                    await i.update({ content: 'Opération annulée.', embeds: [], components: [] });
                }
                collector.stop();
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: 'Confirmation expirée.', embeds: [], components: [] });
                }
            });
        }
    },
};

export default NormalizeCommand;
