
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { updateUserXP, checkTesterStatus, getUserLevel } from '@/lib/db';

const OWNER_ID = '556529963877138442';

const XpAdminCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('xpadmin')
        .setDescription("Gère l'XP d'un utilisateur. (Accès restreint)")
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
                        .setMinValue(1))),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild || !interaction.member) {
            await interaction.reply({ content: 'Cette commande doit être utilisée dans un serveur.', ephemeral: true });
            return;
        }

        const isOwner = interaction.user.id === OWNER_ID;
        const isAdmin = (interaction.member.permissions as any).has(PermissionFlagsBits.Administrator);
        const isTester = checkTesterStatus(interaction.user.id, interaction.guild.id).isTester;

        if (!isOwner && !(isAdmin && isTester)) {
            await interaction.reply({ content: "Vous n'avez pas la permission d'utiliser cette commande.", ephemeral: true });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('utilisateur', true);
        let amount = interaction.options.getInteger('montant', true);
        
        if (targetUser.bot) {
            await interaction.editReply({ content: "Vous не pouvez pas modifier l'XP d'un bot." });
            return;
        }

        if (subcommand === 'remove') {
            amount = -amount;
        }

        try {
            updateUserXP(targetUser.id, interaction.guild.id, amount);
            
            const newUserLevel = getUserLevel(targetUser.id, interaction.guild.id);

            const embed = new EmbedBuilder()
                .setColor(amount > 0 ? 0x00FF00 : 0xFF0000)
                .setAuthor({ name: `Modification d'XP pour ${targetUser.tag}`, iconURL: targetUser.displayAvatarURL() || undefined })
                .setDescription(`**${Math.abs(amount)}** XP ont été ${amount > 0 ? 'ajoutés à' : 'retirés de'} ${targetUser.toString()}.`)
                .addFields({ name: 'Nouveau Solde', value: `**${newUserLevel.xp}** XP (Niveau ${newUserLevel.level})` })
                .setFooter({ text: `Action effectuée par ${interaction.user.tag}` });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('[XpAdminCommand] Error:', error);
            await interaction.editReply({ content: "Une erreur est survenue lors de la modification de l'XP." });
        }
    },
};

export default XpAdminCommand;
