
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, getUserLevel, updateUserXP } from '@/lib/db';

const PileOuFaceCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('pileouface')
        .setDescription('Jouez à pile ou face avec vos XP.')
        .addIntegerOption(option =>
            option.setName('montant')
                .setDescription('La quantité d\'XP à miser.')
                .setRequired(true)
                .setMinValue(1))
        .addStringOption(option =>
            option.setName('choix')
                .setDescription('Votre choix.')
                .setRequired(true)
                .addChoices(
                    { name: 'Pile', value: 'pile' },
                    { name: 'Face', value: 'face' }
                )),

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
        const choice = interaction.options.getString('choix', true);
        const user = interaction.user;

        const userLevel = getUserLevel(user.id, interaction.guild.id);

        if (userLevel.xp < amount) {
            await interaction.reply({ content: `Vous n'avez pas assez d'XP pour miser ce montant. Vous avez ${userLevel.xp} XP.`, ephemeral: true });
            return;
        }

        await interaction.deferReply();

        // Deduct the bet amount
        updateUserXP(user.id, interaction.guild.id, -amount);

        const result = Math.random() < 0.5 ? 'pile' : 'face';
        const win = result === choice;

        const embed = new EmbedBuilder()
            .setAuthor({ name: `Pile ou Face de ${user.username}`, iconURL: user.displayAvatarURL() });

        if (win) {
            const winnings = amount * 2;
            updateUserXP(user.id, interaction.guild.id, winnings);
            embed
                .setColor(0x00FF00)
                .setTitle('🎉 Victoire ! 🎉')
                .setDescription(`La pièce est tombée sur **${result}**. Vous avez choisi **${choice}** et gagnez **${winnings}** XP !`)
                .setFooter({ text: `Nouveau solde : ${userLevel.xp - amount + winnings} XP` });
        } else {
            embed
                .setColor(0xFF0000)
                .setTitle('❌ Défaite... ❌')
                .setDescription(`La pièce est tombée sur **${result}**. Vous avez choisi **${choice}** et perdez votre mise de **${amount}** XP.`)
                .setFooter({ text: `Nouveau solde : ${userLevel.xp - amount} XP` });
        }

        await interaction.editReply({ embeds: [embed] });
    },
};

export default PileOuFaceCommand;
