
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';

const IAEditServCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('iaeditserv')
        .setDescription('Modifie la structure du serveur avec l\'IA (Fonctionnalité Externe).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => 
            option.setName('request')
                .setDescription('Décrivez les modifications à apporter (ex: "ajoute un salon #annonces").')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
         const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('Fonctionnalité en Évolution')
            .setDescription(
                'Le module "Server Builder IA" est désormais géré par un **bot externe partenaire** pour une expérience améliorée et plus puissante.\n\n' +
                'Pour utiliser cette fonctionnalité, veuillez inviter le bot dédié depuis notre site web ou serveur de support.\n\n' +
                'Cette fonctionnalité reste une exclusivité **Premium**.'
            )
            .setFooter({ text: 'Merci de votre compréhension !' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};

export default IAEditServCommand;
