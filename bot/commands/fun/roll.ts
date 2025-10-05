
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig } from '@/lib/db';

const RollCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Lance un dé.')
        .addIntegerOption(option =>
            option.setName('faces')
                .setDescription('Le nombre de faces du dé. (Défaut: 6)')
                .setMinValue(2)
                .setMaxValue(1000)
                .setRequired(false)),

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

        const faces = interaction.options.getInteger('faces') || 6;
        const result = Math.floor(Math.random() * faces) + 1;

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`🎲 Lancer de dé à ${faces} faces`)
            .setDescription(`**${interaction.user.username}** a obtenu... **${result}** !`)
            .setThumbnail('https://cdn.discordapp.com/attachments/1118649503445893190/1188551336696229989/dice.gif?ex=659b036c&is=65888e6c&hm=a144f33663f7d145c2253add8b38e4693a121590483863454794895085355157&');
            
        await interaction.reply({ embeds: [embed] });
    },
};

export default RollCommand;
