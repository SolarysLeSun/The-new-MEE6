
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
            .setColor(0xFF7300)
            .setTitle('👋 Bonjour, je suis Marcus !')
            .setDescription('Votre assistant de gestion et d\'animation pour ce serveur Discord.')
            .addFields(
                {
                    name: '🚀 Panel de Configuration',
                    value: 'La plus grande partie de ma configuration se passe sur une interface web. Pour y accéder, un administrateur doit utiliser la commande `/login`. Vous recevrez un lien de connexion unique et sécurisé.',
                },
                {
                    name: '📜 Liste des Commandes',
                    value: 'Pour voir la liste complète de toutes les commandes que je peux exécuter, utilisez la commande `/marcus`.',
                },
                 {
                    name: '💡 Suggestions',
                    value: 'Vous avez une idée pour améliorer ce serveur ? Utilisez `/suggest serveur`.\nVous avez une idée pour m\'améliorer ? Utilisez `/suggest bot` pour l\'envoyer directement à mon créateur !',
                }
            )
            .setTimestamp()
            .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() || undefined });
        
        await interaction.editReply({ embeds: [helpEmbed] });
    },
};

export default HelpCommand;
