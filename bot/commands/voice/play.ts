import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '@/types';

const PlayCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Joue une chanson depuis YouTube.')
        .addStringOption(option =>
            option.setName('chanson')
                .setDescription('Le nom ou l\'URL de la chanson sur YouTube.')
                .setRequired(true)),
    
    async execute(interaction: ChatInputCommandInteraction, musicPlayer: any) {
        await interaction.deferReply();
        await musicPlayer.play(interaction);
    },
};

export default PlayCommand;
