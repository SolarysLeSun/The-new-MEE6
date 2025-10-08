
import { ContextMenuCommandBuilder, ApplicationCommandType, UserContextMenuCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import type { Command } from '@/types';

const KickVocContextCommand: Command = {
    data: new ContextMenuCommandBuilder()
        .setName('Expulser du vocal')
        .setType(ApplicationCommandType.User)
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction: UserContextMenuCommandInteraction) {
        if (!interaction.guild) return;

        await interaction.deferReply({ ephemeral: true });

        const member = await interaction.guild.members.fetch(interaction.targetId);
        if (!member) {
            await interaction.editReply({ content: "Impossible de trouver cet utilisateur sur le serveur." });
            return;
        }

        if (!member.voice.channel) {
            await interaction.editReply({ content: "Cet utilisateur n'est pas dans un salon vocal." });
            return;
        }
        
        try {
            await member.voice.disconnect(`Expulsion vocale par ${interaction.user.tag}`);
            await interaction.editReply({ content: `✅ **${member.user.tag}** a été expulsé(e) de son salon vocal.` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: `❌ Impossible de déconnecter l'utilisateur.` });
        }
    },
};

export default KickVocContextCommand;
