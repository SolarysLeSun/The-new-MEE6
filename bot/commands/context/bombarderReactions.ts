
import { ContextMenuCommandBuilder, ApplicationCommandType, MessageContextMenuCommandInteraction, PermissionFlagsBits } from 'discord.js';
import type { Command } from '@/types';

const emojiList = ["😀", "😂", "😍", "🤔", "🔥", "❤️", "👍", "👎", "🎉", "🚀", "💯", "🤯", "🤡", "💀", "👽", "🐧", "🎃", "🎁", "👀", "🙏"];

const ReactBombContextCommand: Command = {
    data: new ContextMenuCommandBuilder()
        .setName('Bombarder de réactions')
        .setType(ApplicationCommandType.Message)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: MessageContextMenuCommandInteraction) {
        if (!interaction.channel) return;
        
        await interaction.deferReply({ ephemeral: true });

        const message = interaction.targetMessage;
        const reactionsToAdd = emojiList.sort(() => 0.5 - Math.random()).slice(0, 20);

        for (const emoji of reactionsToAdd) {
            try {
                await message.react(emoji);
            } catch (reactError) {
               console.warn(`[ReactBombContext] Impossible d'ajouter l'emoji ${emoji}`);
            }
        }

        await interaction.editReply(`✅ Bombardement de réactions terminé sur le message !`);
    },
};

export default ReactBombContextCommand;
