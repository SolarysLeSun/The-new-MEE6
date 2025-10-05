
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, getUserLevel, updateUserXP } from '@/lib/db';

const emojis = ['🍒', '🍋', '🍊', '🍉', '⭐', '🔔', '💎'];
const payouts = {
    '💎💎💎': 25,
    '⭐⭐⭐': 20,
    '🔔🔔🔔': 15,
    '🍉🍉🍉': 10,
    '🍊🍊🍊': 5,
    '🍋🍋🍋': 4,
    '🍒🍒🍒': 3,
};

const SlotsCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Jouez à la machine à sous avec vos XP.')
        .addIntegerOption(option =>
            option.setName('montant')
                .setDescription('La quantité d\'XP à miser.')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', ephemeral: true });
            return;
        }

        const config = await getServerConfig(interaction.guild.id, 'leveling');
        if (!config?.enabled) {
            await interaction.reply({ content: 'Le système de niveaux (et donc le casino) est désactivé sur ce serveur.', ephemeral: true });
            return;
        }

        const amount = interaction.options.getInteger('montant', true);
        const user = interaction.user;

        const userLevel = getUserLevel(user.id, interaction.guild.id);

        if (userLevel.xp < amount) {
            await interaction.reply({ content: `Vous n'avez pas assez d'XP pour miser ce montant. Vous avez ${userLevel.xp} XP.`, ephemeral: true });
            return;
        }

        await interaction.deferReply();

        // Deduct the bet amount
        updateUserXP(user.id, interaction.guild.id, -amount);

        const reel1 = emojis[Math.floor(Math.random() * emojis.length)];
        const reel2 = emojis[Math.floor(Math.random() * emojis.length)];
        const reel3 = emojis[Math.floor(Math.random() * emojis.length)];

        const resultKey = `${reel1}${reel2}${reel3}`;
        const payoutMultiplier = (payouts as any)[resultKey] || 0;
        const winnings = amount * payoutMultiplier;

        const embed = new EmbedBuilder()
            .setTitle('🎰 Machine à Sous 🎰')
            .setDescription(`**[ ${reel1} | ${reel2} | ${reel3} ]**`);

        if (winnings > 0) {
            updateUserXP(user.id, interaction.guild.id, winnings);
            embed
                .setColor(0xFFD700) // Gold
                .addFields({ name: '🎉 JACKPOT! 🎉', value: `Vous avez gagné **${winnings}** XP !` })
                .setFooter({ text: `Nouveau solde : ${userLevel.xp - amount + winnings} XP` });
        } else {
             embed
                .setColor(0x95A5A6) // Gray
                .addFields({ name: 'Dommage...', value: `Vous perdez votre mise de **${amount}** XP. Retentez votre chance !` })
                .setFooter({ text: `Nouveau solde : ${userLevel.xp - amount} XP` });
        }
        
        await interaction.editReply({ embeds: [embed] });
    },
};

export default SlotsCommand;
