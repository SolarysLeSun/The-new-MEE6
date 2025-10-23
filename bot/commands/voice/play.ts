

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '@/types';

const PlayCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Joue une chanson depuis une URL YouTube.')
        .addStringOption(option =>
            option.setName('chanson')
                .setDescription("L'URL de la chanson sur YouTube (ex: https://youtu.be/...).")
                .setRequired(true)),
    
    async execute(interaction: ChatInputCommandInteraction, musicPlayer: any) {
        await interaction.deferReply();
        await musicPlayer.play(interaction);
    },
};

export default PlayCommand;
