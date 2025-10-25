
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { generateApiKey } from '@/lib/db';

const ApiKeyCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('apikey')
        .setDescription('Génère une clé d\'API pour accéder aux données de ce serveur.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande doit être utilisée dans un serveur.', ephemeral: true });
            return;
        }

        try {
            const apiKey = generateApiKey(interaction.user.id, interaction.guild.id);
            
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🔑 Votre Clé d\'API a été générée')
                .setDescription(
                    "Voici votre clé d'API pour le serveur **" + interaction.guild.name + "**. " +
                    "**Ne la partagez avec personne !** Elle donne accès à certaines données de votre serveur via l'API publique."
                )
                .addFields({ name: 'Votre Clé', value: `\`\`\`${apiKey}\`\`\`` })
                .setFooter({ text: 'Si vous pensez que votre clé a été compromise, générez-en une nouvelle avec cette même commande.' });
            
            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('[ApiKeyCommand] Error generating API key:', error);
            await interaction.reply({ content: "Une erreur est survenue lors de la génération de la clé d'API.", ephemeral: true });
        }
    },
};

export default ApiKeyCommand;
