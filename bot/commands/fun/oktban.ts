
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, updateServerConfig } from '@/lib/db';

const OKTBanCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('oktban')
        .setDescription('Active ou désactive la réaction OK T BAN à chaque message.')
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

        const newState = !config.oktban_enabled;
        updateServerConfig(interaction.guild.id, 'fun-commands', { ...config, oktban_enabled: newState });

        const embed = new EmbedBuilder()
            .setColor(newState ? 0x00FF00 : 0xFF0000)
            .setDescription(`Le mode **OK T BAN** a été **${newState ? 'activé' : 'désactivé'}**.`);
            
        await interaction.reply({ embeds: [embed] });
    },
};

export default OKTBanCommand;
