
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig } from '@/lib/db';

const RenameAllCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('renameall')
        .setDescription('Renomme ou réinitialise les surnoms des membres du serveur.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Renomme tous les membres (sauf admins) avec un nouveau modèle.')
                .addStringOption(option =>
                    option.setName('nickname')
                        .setDescription('Le nouveau surnom. Utilisez {number} pour insérer un numéro unique.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Réinitialise le surnom de tous les membres (sauf admins).')),


    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', flags: MessageFlags.Ephemeral });
            return;
        }

        const config = await getServerConfig(interaction.guild.id, 'fun-commands');
        if (!config?.enabled) {
            await interaction.reply({ content: "Le module de commandes fun est désactivé.", flags: MessageFlags.Ephemeral });
            return;
        }
        
        const subcommand = interaction.options.getSubcommand();
        await interaction.deferReply({ ephemeral: true });

        try {
            await interaction.guild.members.fetch();
            const membersToModify = interaction.guild.members.cache.filter(member => 
                !member.permissions.has(PermissionFlagsBits.Administrator) && !member.user.bot
            );

            let modifiedCount = 0;

            if (subcommand === 'set') {
                const nicknamePattern = interaction.options.getString('nickname', true);
                if (nicknamePattern.replace('{number}', '9999').length > 32) {
                    await interaction.editReply({ content: 'Le modèle de surnom est trop long et dépassera la limite de 32 caractères de Discord.', flags: MessageFlags.Ephemeral });
                    return;
                }

                let renameCounter = 1;
                for (const member of membersToModify.values()) {
                    const finalNickname = nicknamePattern.replace('{number}', String(renameCounter));
                    if (finalNickname.length > 32) continue;

                    try {
                        await member.setNickname(finalNickname, `Renommage de masse par ${interaction.user.tag}`);
                        modifiedCount++;
                        renameCounter++;
                    } catch (err) {
                        console.log(`Impossible de renommer ${member.user.tag}`);
                    }
                }
                 await interaction.editReply(`✅ ${modifiedCount} membre(s) ont été renommé(s) en utilisant le modèle "**${nicknamePattern}**".`);

            } else if (subcommand === 'reset') {
                 for (const member of membersToModify.values()) {
                    try {
                        if (member.nickname) { // Only reset if they have a nickname
                            await member.setNickname(null, `Réinitialisation des surnoms par ${interaction.user.tag}`);
                            modifiedCount++;
                        }
                    } catch (err) {
                        console.log(`Impossible de réinitialiser le surnom de ${member.user.tag}`);
                    }
                }
                await interaction.editReply(`✅ Le surnom de ${modifiedCount} membre(s) a été réinitialisé.`);
            }

        } catch (error) {
            console.error('[RenameAll] Error:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de l\'opération de masse.' });
        }
    },
};

export default RenameAllCommand;
