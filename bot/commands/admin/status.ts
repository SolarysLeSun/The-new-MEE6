
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, ActivityType } from 'discord.js';
import type { Command } from '@/types';

const OWNER_ID = '556529963877138442';

const StatusCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Définit ou efface le statut personnalisé du bot. (Propriétaire seulement)')
        .setDMPermission(true)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Définit un nouveau statut personnalisé.')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Le message à afficher dans le statut.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Réinitialise le statut du bot à son état par défaut.')),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID) {
            await interaction.reply({ content: 'Cette commande est exclusivement réservée au propriétaire du bot.', flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        const client = interaction.client;

        try {
            if (subcommand === 'set') {
                const message = interaction.options.getString('message', true);
                
                client.user?.setActivity({
                    name: message,
                    type: ActivityType.Custom,
                });

                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('Statut Personnalisé Défini')
                    .setDescription(`Le statut du bot affiche maintenant : **${message}**`);

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'clear') {
                const panelUrl = process.env.PANEL_BASE_URL || 'http://localhost:9002';
                client.user?.setActivity({
                    name: `Panel: ${panelUrl}`,
                    type: ActivityType.Playing,
                });
                 
                await interaction.editReply({ content: '✅ Le statut du bot a été réinitialisé à sa valeur par défaut.' });
            }
        } catch (error) {
            console.error(`[StatusCommand] Error executing subcommand ${subcommand}:`, error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de l\'exécution de cette commande.' });
        }
    },
};

export default StatusCommand;
