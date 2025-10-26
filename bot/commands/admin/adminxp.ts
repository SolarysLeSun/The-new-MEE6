

import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, Guild } from 'discord.js';
import type { Command } from '@/types';
import { updateUserXP, checkTesterStatus, getUserLevel, setUserLevel, db } from '@/lib/db';

const OWNER_ID = '556529963877138442';

const AdminXpCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('adminxp')
        .setDescription("Gère l'XP et le niveau d'un utilisateur. (Admin seulement)")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription("Ajoute de l'XP à un utilisateur.")
                .addUserOption(option =>
                    option.setName('utilisateur')
                        .setDescription("L'utilisateur à qui ajouter de l'XP.")
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('montant')
                        .setDescription("La quantité d'XP à ajouter.")
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription("Retire de l'XP à un utilisateur.")
                .addUserOption(option =>
                    option.setName('utilisateur')
                        .setDescription("L'utilisateur à qui retirer de l'XP.")
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('montant')
                        .setDescription("La quantité d'XP à retirer.")
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription("Définit l'XP ou le niveau exact d'un utilisateur.")
                .addUserOption(option =>
                    option.setName('utilisateur')
                        .setDescription("L'utilisateur à modifier.")
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('niveau')
                        .setDescription("Le niveau exact à définir pour l'utilisateur.")
                        .setMinValue(0))
                .addIntegerOption(option =>
                    option.setName('xp')
                        .setDescription("Le montant total d'XP à définir pour l'utilisateur.")
                        .setMinValue(0))),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild || !interaction.member) {
            await interaction.reply({ content: 'Cette commande doit être utilisée dans un serveur.', ephemeral: true });
            return;
        }

        const isOwner = interaction.user.id === OWNER_ID;
        const isAdmin = (interaction.member.permissions as any).has(PermissionFlagsBits.Administrator);

        if (!isOwner && !isAdmin) {
            await interaction.reply({ content: "Vous n'avez pas la permission d'utiliser cette commande.", ephemeral: true });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('utilisateur', true);
        
        if (targetUser.bot) {
            await interaction.editReply({ content: "Vous ne pouvez pas modifier l'XP d'un bot." });
            return;
        }

        try {
            let embed: EmbedBuilder | null = null;
            
            switch (subcommand) {
                case 'add':
                case 'remove': {
                    let amount = interaction.options.getInteger('montant', true);
                    if (subcommand === 'remove') {
                        amount = -amount;
                    }
                    updateUserXP(targetUser.id, interaction.guild.id, amount, 'add');
                     const newUserLevel = getUserLevel(targetUser.id, interaction.guild.id);
                    embed = new EmbedBuilder()
                        .setColor(amount > 0 ? 0x00FF00 : 0xFF0000)
                        .setAuthor({ name: `Modification d'XP pour ${targetUser.tag}`, iconURL: targetUser.displayAvatarURL() || undefined })
                        .setDescription(`**${Math.abs(amount)}** XP ont été ${amount > 0 ? 'ajoutés à' : 'retirés de'} ${targetUser.toString()}.`)
                        .addFields({ name: 'Nouveau Solde', value: `Niveau ${newUserLevel.level} (${newUserLevel.totalXp.toLocaleString()} XP total)` })
                        .setFooter({ text: `Action effectuée par ${interaction.user.tag}` });
                    break;
                }
                case 'set': {
                    const level = interaction.options.getInteger('niveau');
                    const xp = interaction.options.getInteger('xp');

                    if (level === null && xp === null) {
                        await interaction.editReply({ content: "Vous devez spécifier soit un niveau, soit un montant d'XP à définir." });
                        return;
                    }
                    
                    if (level !== null) {
                        setUserLevel(targetUser.id, interaction.guild.id, level);
                        const newUserLevel = getUserLevel(targetUser.id, interaction.guild.id);
                        embed = new EmbedBuilder()
                            .setColor(0x00BFFF)
                            .setAuthor({ name: `Modification de Niveau pour ${targetUser.tag}`, iconURL: targetUser.displayAvatarURL() || undefined })
                            .setDescription(`${targetUser.toString()} a été défini(e) au **Niveau ${level}**.`)
                            .addFields({ name: 'Nouveau Solde', value: `Niveau ${newUserLevel.level} (${newUserLevel.totalXp.toLocaleString()} XP total)` })
                            .setFooter({ text: `Action effectuée par ${interaction.user.tag}` });
                    } else if (xp !== null) {
                        updateUserXP(targetUser.id, interaction.guild.id, xp, 'set');
                        const newUserLevel = getUserLevel(targetUser.id, interaction.guild.id);
                        embed = new EmbedBuilder()
                            .setColor(0x00BFFF)
                            .setAuthor({ name: `Modification d'XP pour ${targetUser.tag}`, iconURL: targetUser.displayAvatarURL() || undefined })
                            .setDescription(`L'XP total de ${targetUser.toString()} a été défini à **${xp.toLocaleString()}**.`)
                            .addFields({ name: 'Nouveau Solde', value: `Niveau ${newUserLevel.level} (${newUserLevel.totalXp.toLocaleString()} XP total)` })
                            .setFooter({ text: `Action effectuée par ${interaction.user.tag}` });
                    }
                    break;
                }
            }

            if(embed) {
                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('[XpAdminCommand] Error:', error);
            await interaction.editReply({ content: "Une erreur est survenue lors de la modification de l'XP." });
        }
    },
};

export default AdminXpCommand;
