
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig } from '@/lib/db';

const ReactCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('react')
        .setDescription('Réagit à un message avec un emoji spécifique.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('message_id')
                .setDescription('L\'ID du message auquel réagir.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('emoji')
                .setDescription('L\'emoji ou son ID.')
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
        const emoji = interaction.options.getString('emoji', true);

        try {
            const message = await interaction.channel.messages.fetch(messageId);
            await message.react(emoji);
            await interaction.reply({ content: '✅ Réaction ajoutée.', flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error('[React] Error:', error);
            await interaction.reply({ content: 'Impossible d\'ajouter la réaction. Vérifiez l\'ID du message et que l\'emoji est accessible par le bot.', flags: MessageFlags.Ephemeral });
        }
    },
};

export default ReactCommand;
