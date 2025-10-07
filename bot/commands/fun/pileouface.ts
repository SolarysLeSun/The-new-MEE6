
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, getUserLevel, updateUserXP } from '@/lib/db';

const CoinFlipCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('pileouface')
        .setDescription('Pariez votre XP sur un lancer de pièce.')
        .addIntegerOption(option =>
            option.setName('montant')
                .setDescription("La quantité d'XP à parier.")
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

        const config = await getServerConfig(interaction.guild.id, 'fun-commands');
        if (!config?.enabled) {
            await interaction.reply({ content: "Le module de commandes fun est désactivé.", ephemeral: true });
            return;
        }
        
        const levelingConfig = await getServerConfig(interaction.guild.id, 'leveling');
        if(!levelingConfig?.enabled) {
            await interaction.reply({ content: "Le système de niveaux est désactivé, vous ne pouvez pas parier d'XP.", ephemeral: true });
            return;
        }

        const amount = interaction.options.getInteger('montant', true);
        const choice = interaction.options.getString('choix', true);

        const userLevel = getUserLevel(interaction.user.id, interaction.guild.id);

        if (userLevel.xp < amount) {
            await interaction.reply({ content: `Vous n'avez pas assez d'XP pour parier ce montant. Vous avez actuellement ${userLevel.xp} XP.`, ephemeral: true });
            return;
        }
        
        const result = Math.random() < 0.5 ? 'pile' : 'face';
        const win = result === choice;
        const xpChange = win ? amount : -amount;

        updateUserXP(interaction.user.id, interaction.guild.id, xpChange);

        const embed = new EmbedBuilder()
            .setTitle('Pile ou Face')
            .setDescription(`La pièce tourne... et elle atterrit sur **${result.toUpperCase()}** !`)
            .setColor(win ? 0x00FF00 : 0xFF0000)
            .addFields({
                name: win ? '🎉 Victoire ! 🎉' : '💀 Défaite... 💀',
                value: `Vous avez ${win ? 'gagné' : 'perdu'} **${amount}** XP. Votre nouveau solde est de **${userLevel.xp + xpChange}** XP.`
            });

        await interaction.reply({ embeds: [embed] });
    },
};

export default CoinFlipCommand;
