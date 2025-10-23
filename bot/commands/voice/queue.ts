import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '@/types';

const QueueCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Affiche la file d\'attente des chansons.'),
    
    async execute(interaction: ChatInputCommandInteraction, musicPlayer: any) {
        await musicPlayer.queue(interaction);
    },
};

export default QueueCommand;
