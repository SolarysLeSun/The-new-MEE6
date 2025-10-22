
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, updateServerConfig } from '@/lib/db';

const GayPrideCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('gaypride')
        .setDescription('Active ou désactive la réaction 🏳️‍🌈 à chaque message.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

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

        const newState = !config.gaypride_enabled;
        updateServerConfig(interaction.guild.id, 'fun-commands', { ...config, gaypride_enabled: newState });

        const embed = new EmbedBuilder()
            .setColor(newState ? 0x00FF00 : 0xFF0000)
            .setDescription(`Le mode **Gay Pride** (réaction 🏳️‍🌈) a été **${newState ? 'activé' : 'désactivé'}**.`);
            
        await interaction.reply({ embeds: [embed] });
    },
};

export default GayPrideCommand;
