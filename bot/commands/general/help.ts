

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../../../src/types';
import { getServerConfig } from '../../../src/lib/db';

const HelpCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Affiche des informations utiles sur le fonctionnement de Marcus.'),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: true });

        if (!interaction.guildId) {
            await interaction.editReply({ content: "Une erreur est survenue." });
            return;
        }

        const config = await getServerConfig(interaction.guildId, 'general-commands');
        if (!config?.command_enabled?.help) {
            await interaction.editReply({ content: "Cette commande est désactivée sur ce serveur." });
            return;
        }

        const helpEmbed = new EmbedBuilder()
            .setColor(0x00BFFF)
            .setTitle('👋 Prise en main de Marcus')
            .setDescription('Voici les commandes essentielles pour bien démarrer avec moi :')
            .addFields(
                {
                    name: '<:point_h:1421563605630845009> Accéder au Panel de Configuration',
                    value: 'La plus grande partie de ma configuration se passe sur une interface web. Pour y accéder, un administrateur doit utiliser la commande `/login`. Vous recevrez un lien de connexion unique et sécurisé.',
                },
                {
                    name: '<:point_h:1421563605630845009> Lister Toutes les Fonctionnalités',
                    value: 'Pour voir la liste complète de toutes les commandes, utilisez la commande `/marcus`.',
                },
                {
                    name: '<:point_h:1421563605630845009> Trouver une Fonctionnalité (IA)',
                    value: 'Vous ne savez pas où configurer quelque chose ? Demandez-moi ! Utilisez `/marcusfaq` suivi de votre question (ex: `/marcusfaq où configurer le message de bienvenue ?`).',
                },
                 {
                    name: '<:point_h:1421563605630845009> Suggérer une Amélioration',
                    value: 'Vous avez une idée pour améliorer ce serveur ? Utilisez `/suggest serveur`.\nVous avez une idée pour m\'améliorer ? Utilisez `/suggest bot` pour l\'envoyer directement à mon créateur !',
                }
            )
            .setTimestamp()
            .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() || undefined });
        
        await interaction.editReply({ embeds: [helpEmbed] });
    },
};

export default HelpCommand;
