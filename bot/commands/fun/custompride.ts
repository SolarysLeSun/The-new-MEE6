

import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, updateServerConfig } from '@/lib/db';

const CustomPrideCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('custompride')
        .setDescription('Définit ou désactive un emoji de réaction personnalisé.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Définit un emoji de réaction personnalisé.')
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('L\'emoji à utiliser pour les réactions.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Désactive la réaction personnalisée.')),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', ephemeral: true });
            return;
        }

        const config = await getServerConfig(interaction.guild.id, 'fun-commands');
        if (!config?.enabled) {
            await interaction.reply({ content: "Le module de commandes fun est désactivé.", ephemeral: true });
            return;
        }
        
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'set') {
            const emoji = interaction.options.getString('emoji', true);
            // Simple validation to check if it's a plausible emoji
            const emojiRegex = /^(?:<a?:\w+:\d+>|\p{Emoji_Presentation}|\p{Emoji})$/u;
            if (!emojiRegex.test(emoji)) {
                await interaction.reply({ content: "Veuillez fournir un emoji valide (soit un emoji standard, soit un emoji personnalisé du serveur).", ephemeral: true });
                return;
            }

            updateServerConfig(interaction.guild.id, 'fun-commands', { ...config, custom_pride_emoji: emoji });
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setDescription(`La réaction automatique a été définie sur ${emoji}.`);
            await interaction.reply({ embeds: [embed] });
        } else if (subcommand === 'disable') {
             updateServerConfig(interaction.guild.id, 'fun-commands', { ...config, custom_pride_emoji: null });
             const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setDescription(`La réaction automatique personnalisée a été désactivée.`);
            await interaction.reply({ embeds: [embed] });
        }
    },
};

export default CustomPrideCommand;
