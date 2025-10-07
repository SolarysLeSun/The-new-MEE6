
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig } from '@/lib/db';

const DiceCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('de')
        .setDescription('Lance un ou plusieurs dés.')
        .addIntegerOption(option =>
            option.setName('nombre')
                .setDescription('Le nombre de dés à lancer (défaut: 1).')
                .setMinValue(1)
                .setMaxValue(25))
        .addIntegerOption(option =>
            option.setName('faces')
                .setDescription('Le nombre de faces sur les dés (défaut: 6).')
                .setMinValue(2)
                .setMaxValue(100)),

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

        const numberOfDice = interaction.options.getInteger('nombre') || 1;
        const numberOfFaces = interaction.options.getInteger('faces') || 6;

        const rolls: number[] = [];
        for (let i = 0; i < numberOfDice; i++) {
            rolls.push(Math.floor(Math.random() * numberOfFaces) + 1);
        }

        const sum = rolls.reduce((a, b) => a + b, 0);

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle(`🎲 Lancer de ${numberOfDice}d${numberOfFaces}`)
            .setDescription(`**Résultats :** ${rolls.join(', ')}`)
            .addFields({ name: 'Total', value: `**${sum}**`, inline: true });

        await interaction.reply({ embeds: [embed] });
    },
};

export default DiceCommand;
