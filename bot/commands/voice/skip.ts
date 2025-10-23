import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '@/types';

const SkipCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Passe à la chanson suivante dans la file d\'attente.'),
    
    async execute(interaction: ChatInputCommandInteraction, musicPlayer: any) {
        await musicPlayer.skip(interaction);
    },
};

export default SkipCommand;
