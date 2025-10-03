
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { generateAuthToken } from '../../auth';

const LoginCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('login')
        .setDescription('Génère un lien de connexion unique pour accéder au panel de configuration.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', ephemeral: true });
            return;
        }

        // Defer the reply to prevent "Unknown Interaction" errors
        await interaction.deferReply({ ephemeral: true });

        const user = interaction.user;
        const guild = interaction.guild;

        try {
            const token = generateAuthToken(user.id, guild.id);
            
            const panelUrl = process.env.PANEL_BASE_URL;
            if (!panelUrl) {
                console.error('[LoginCommand] PANEL_BASE_URL is not defined in .env file.');
                throw new Error('Configuration du panel incomplète.');
            }
            
            const loginUrl = `${panelUrl}/auth/discord?token=${token}`;

            const embed = new EmbedBuilder()
                .setColor(0x00BFFF)
                .setTitle('🔗 Votre lien de connexion au panel')
                .setDescription(`Cliquez sur le bouton ci-dessous pour accéder au panel de configuration du serveur **${guild.name}**.`)
                .addFields(
                    { name: 'Valide pour', value: '5 minutes', inline: true },
                    { name: 'Usage unique', value: 'Oui', inline: true }
                )
                .setFooter({ text: 'Ce lien est personnel et ne doit pas être partagé.' });

            const row = {
                type: 1, // ActionRow
                components: [
                    {
                        type: 2, // Button
                        style: 5, // Link
                        label: 'Accéder au panel',
                        url: loginUrl,
                    }
                ]
            };

            await interaction.editReply({
                embeds: [embed],
                components: [row],
            });

        } catch (error) {
            console.error('[LoginCommand] Error generating auth token link:', error);
            // Check if the interaction has already been replied to before sending another reply
            if (!interaction.replied && !interaction.deferred) {
                 await interaction.reply({
                    content: 'Une erreur est survenue lors de la création de votre lien de connexion. Veuillez réessayer plus tard.',
                    ephemeral: true,
                });
            } else {
                 await interaction.editReply({
                    content: 'Une erreur est survenue lors de la création de votre lien de connexion. Veuillez réessayer plus tard.',
                });
            }
        }
    },
};

export default LoginCommand;
