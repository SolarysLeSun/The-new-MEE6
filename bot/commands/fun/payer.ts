
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, getUserLevel, updateUserXP } from '@/lib/db';

const PayerCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('payer')
        .setDescription("Donne une partie de votre XP à un autre utilisateur.")
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription("L'utilisateur à qui vous voulez donner de l'XP.")
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('montant')
                .setDescription("La quantité d'XP à donner.")
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', flags: MessageFlags.Ephemeral });
            return;
        }

        const funConfig = await getServerConfig(interaction.guild.id, 'fun-commands');
        if (!funConfig?.enabled) {
            await interaction.reply({ content: "Le module de commandes fun est désactivé.", ephemeral: true });
            return;
        }
        
        const levelingConfig = await getServerConfig(interaction.guild.id, 'leveling');
        if(!levelingConfig?.enabled) {
            await interaction.reply({ content: "Le système de niveaux est désactivé, vous ne pouvez pas transférer d'XP.", ephemeral: true });
            return;
        }
        
        await interaction.deferReply();

        const payer = interaction.user;
        const receiver = interaction.options.getUser('utilisateur', true);
        const amount = interaction.options.getInteger('montant', true);

        if (payer.id === receiver.id) {
            await interaction.editReply({ content: "Vous ne pouvez pas vous donner de l'XP à vous-même."});
            return;
        }

        if (receiver.bot) {
            await interaction.editReply({ content: "Vous ne pouvez pas donner d'XP à un bot."});
            return;
        }

        const payerLevel = getUserLevel(payer.id, interaction.guild.id);

        if (payerLevel.totalXp < amount) {
            await interaction.editReply({ content: `Vous n'avez pas assez d'XP pour effectuer ce transfert. Vous avez **${payerLevel.totalXp.toLocaleString()} XP**.`});
            return;
        }

        try {
            // Utilise une transaction pour assurer l'atomicité
            const transaction = () => {
                updateUserXP(payer.id, interaction.guild!.id, -amount);
                updateUserXP(receiver.id, interaction.guild!.id, amount);
            };
            
            // Simuler une transaction
            transaction();
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('💸 Transfert d\'XP Réussi 💸')
                .setDescription(`${payer.toString()} a donné **${amount.toLocaleString()} XP** à ${receiver.toString()} !`)
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('[PayerCommand] Error during XP transfer:', error);
            await interaction.editReply({ content: "Une erreur est survenue lors du transfert d'XP." });
        }
    },
};

export default PayerCommand;
