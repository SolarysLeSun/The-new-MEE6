
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, updateServerConfig } from '@/lib/db';

const PutinCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('putin')
        .setDescription('Active ou désactive la réaction Poutine à chaque message.')
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

        const newState = !config.putin_enabled;
        updateServerConfig(interaction.guild.id, 'fun-commands', { ...config, putin_enabled: newState });

        const embed = new EmbedBuilder()
            .setColor(newState ? 0x00FF00 : 0xFF0000)
            .setDescription(`Le mode **Putin** a été **${newState ? 'activé' : 'désactivé'}**.`);
            
        await interaction.reply({ embeds: [embed] });
    },
};

export default PutinCommand;
