
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig } from '@/lib/db';

const RenameAllCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('renameall')
        .setDescription('Renomme tous les membres du serveur qui ne sont pas administrateurs.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('nickname')
                .setDescription('Le nouveau surnom pour tous les membres.')
                .setRequired(true)),

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

        const nickname = interaction.options.getString('nickname', true);

        if (nickname.length > 32) {
            await interaction.reply({ content: 'Le surnom ne peut pas dépasser 32 caractères.', flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const members = await interaction.guild.members.fetch();
            const membersToRename = members.filter(member => !member.permissions.has(PermissionFlagsBits.Administrator));

            let renamedCount = 0;
            for (const member of membersToRename.values()) {
                try {
                    await member.setNickname(nickname, `Renommage de masse par ${interaction.user.tag}`);
                    renamedCount++;
                } catch (err) {
                    console.log(`Impossible de renommer ${member.user.tag}`);
                }
            }

            await interaction.editReply(`✅ ${renamedCount} membre(s) ont été renommé(s) en "**${nickname}**".`);

        } catch (error) {
            console.error('[RenameAll] Error:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors du renommage de masse.' });
        }
    },
};

export default RenameAllCommand;
