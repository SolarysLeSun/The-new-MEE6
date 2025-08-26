
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
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', flags: MessageFlags.Ephemeral });
            return;
        }

        const user = interaction.user;
        const guild = interaction.guild;

        try {
            const { token, error } = generateAuthToken(user.id, guild.id);

            if (error) {
                await interaction.reply({ content: 'Vous n\'êtes pas autorisé à accéder au panel de ce serveur.', flags: MessageFlags.Ephemeral });
                return;
            }
            
            const panelUrl = process.env.PANEL_BASE_URL || 'http://localhost:9002';
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

            await interaction.reply({
                embeds: [embed],
                components: [row],
                flags: MessageFlags.Ephemeral,
            });

        } catch (error) {
            console.error('[LoginCommand] Error generating auth token link:', error);
            await interaction.reply({
                content: 'Une erreur est survenue lors de la création de votre lien de connexion. Veuillez réessayer plus tard.',
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};

export default LoginCommand;
