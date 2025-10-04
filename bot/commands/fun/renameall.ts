
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
                .setDescription('Le nouveau surnom. Utilisez {number} pour insérer un numéro unique.')
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

        const nicknamePattern = interaction.options.getString('nickname', true);

        // Preliminary check to see if the base pattern is too long
        if (nicknamePattern.replace('{number}', '9999').length > 32) { // Assume a large number for safety check
            await interaction.reply({ content: 'Le modèle de surnom est trop long et dépassera la limite de 32 caractères de Discord.', flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const members = await interaction.guild.members.fetch();
            const membersToRename = members.filter(member => !member.permissions.has(PermissionFlagsBits.Administrator));

            let renamedCount = 0;
            let renameCounter = 1;

            for (const member of membersToRename.values()) {
                const finalNickname = nicknamePattern.replace('{number}', String(renameCounter));
                if (finalNickname.length > 32) continue; // Skip if somehow the name is still too long

                try {
                    await member.setNickname(finalNickname, `Renommage de masse par ${interaction.user.tag}`);
                    renamedCount++;
                    renameCounter++;
                } catch (err) {
                    console.log(`Impossible de renommer ${member.user.tag}`);
                }
            }

            await interaction.editReply(`✅ ${renamedCount} membre(s) ont été renommé(s) en utilisant le modèle "**${nicknamePattern}**".`);

        } catch (error) {
            console.error('[RenameAll] Error:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors du renommage de masse.' });
        }
    },
};

export default RenameAllCommand;
