
import { ContextMenuCommandBuilder, ApplicationCommandType, UserContextMenuCommandInteraction, PermissionFlagsBits } from 'discord.js';
import type { Command } from '@/types';

const adjectives = ["Rapide", "Furieux", "Ancien", "Mystique", "Sombre", "Brillant", "Silencieux", "Vaillant", "Sage", "Sauvage"];
const nouns = ["Dragon", "Loup", "Phénix", "Spectre", "Gardien", "Chasseur", "Sorcier", "Prophète", "Titan", "Nomade"];

const RandomNicknameContextCommand: Command = {
    data: new ContextMenuCommandBuilder()
        .setName('Surnom Aléatoire')
        .setType(ApplicationCommandType.User)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: UserContextMenuCommandInteraction) {
        if (!interaction.guild) return;
        await interaction.deferReply({ ephemeral: true });
        
        const member = await interaction.guild.members.fetch(interaction.targetId);
        if (!member) {
            await interaction.editReply({ content: "Impossible de trouver cet utilisateur." });
            return;
        }
        
        const newNickname = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
        
        try {
            await member.setNickname(newNickname, `Surnom aléatoire par ${interaction.user.tag}`);
            await interaction.editReply(`✅ Le surnom de ${member} a été changé en **${newNickname}**.`);
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: "Je n'ai pas pu changer le surnom de cet utilisateur. Vérifiez mes permissions." });
        }
    },
};

export default RandomNicknameContextCommand;
