

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, getUserLevel, updateUserXP } from '@/lib/db';

const emojis = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '🍀'];
const multipliers: { [key: string]: number } = {
    '🍒': 2,
    '🍋': 3,
    '🍊': 4,
    '🍇': 5,
    '🔔': 10,
    '💎': 20,
    '🍀': 50
};

const SlotsCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Jouez à la machine à sous avec votre XP.')
        .addIntegerOption(option =>
            option.setName('montant')
                .setDescription("La quantité d'XP à miser.")
                .setRequired(true)
                .setMinValue(1)),

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

        const levelingConfig = await getServerConfig(interaction.guild.id, 'leveling');
        if (!levelingConfig?.enabled) {
            await interaction.reply({ content: "Le système de niveaux est désactivé, vous ne pouvez pas miser d'XP.", ephemeral: true });
            return;
        }

        const betAmount = interaction.options.getInteger('montant', true);
        const userLevel = getUserLevel(interaction.user.id, interaction.guild.id);

        if (userLevel.totalXp < betAmount) {
            await interaction.reply({ content: `Vous n'avez pas assez d'XP pour miser ce montant. Vous avez actuellement ${userLevel.totalXp} XP.`, ephemeral: true });
            return;
        }

        // --- Spin the slots ---
        const reel1 = emojis[Math.floor(Math.random() * emojis.length)];
        const reel2 = emojis[Math.floor(Math.random() * emojis.length)];
        const reel3 = emojis[Math.floor(Math.random() * emojis.length)];

        let winnings = 0;
        let resultMessage = "Dommage, vous avez perdu.";
        let color: number = 0xFF0000;

        if (reel1 === reel2 && reel2 === reel3) {
            // Jackpot
            winnings = betAmount * multipliers[reel1];
            resultMessage = `🎉 JACKPOT ! Vous gagnez ${winnings} XP ! 🎉`;
            color = 0xFFD700;
        } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
            // Two of a kind (simple refund)
            winnings = betAmount;
            resultMessage = "Presque ! Vous récupérez votre mise.";
            color = 0x3498DB;
        } else {
             winnings = -betAmount;
        }
        
        updateUserXP(interaction.user.id, interaction.guild.id, winnings);
        
        const newUserLevel = getUserLevel(interaction.user.id, interaction.guild.id);
        
        const embed = new EmbedBuilder()
            .setTitle('🎰 Machine à Sous 🎰')
            .setDescription(`**[ ${reel1} | ${reel2} | ${reel3} ]**`)
            .addFields({ name: 'Résultat', value: resultMessage })
            .setFooter({ text: `Nouveau solde : ${newUserLevel.totalXp} XP`})
            .setColor(color);

        await interaction.reply({ embeds: [embed] });
    },
};

export default SlotsCommand;
