import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '@/types';

const StopCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Arrête la musique et déconnecte le bot.'),
    
    async execute(interaction: ChatInputCommandInteraction, musicPlayer: any) {
        if (!interaction.guildId) return;
        await musicPlayer.stop(interaction.guildId);
        await interaction.reply('La musique a été arrêtée et la file d\'attente vidée.');
    },
};

export default StopCommand;
