
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig } from '@/lib/db';

// Liste d'emojis Unicode courants pour le bombardement
const emojiList = ["😀", "😂", "😍", "🤔", "🔥", "❤️", "👍", "👎", "🎉", "🚀", "💯", "🤯", "🤡", "💀", "👽", "🐧", "🎃", "🎁", "👀", "🙏"];


const ReactBombCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('reactbomb')
        .setDescription('Ajoute un maximum de réactions aléatoires à un message.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('message_id')
                .setDescription('L\'ID du message à bombarder de réactions.')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.channel) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un salon.', flags: MessageFlags.Ephemeral });
            return;
        }
        
        const config = await getServerConfig(interaction.guildId!, 'fun-commands');
        if (!config?.enabled) {
            await interaction.reply({ content: "Le module de commandes fun est désactivé.", flags: MessageFlags.Ephemeral });
            return;
        }

        const messageId = interaction.options.getString('message_id', true);
        
        await interaction.deferReply({ ephemeral: true });

        try {
            const message = await interaction.channel.messages.fetch(messageId);
            
            // La limite de Discord est de 20 réactions par message.
            const reactionsToAdd = emojiList.sort(() => 0.5 - Math.random()).slice(0, 20);

            for (const emoji of reactionsToAdd) {
                try {
                    await message.react(emoji);
                } catch (reactError) {
                   console.warn(`[ReactBomb] Impossible d'ajouter l'emoji ${emoji}`);
                }
            }

            await interaction.editReply(`✅ Bombardement de réactions terminé sur le message !`);

        } catch (error) {
            console.error('[ReactBomb] Error:', error);
            await interaction.editReply({ content: 'Impossible de trouver le message spécifié.' });
        }
    },
};

export default ReactBombCommand;
