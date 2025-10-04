
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { setPanelMessage } from '@/lib/db';

const OWNER_ID = '556529963877138442';

const PanelMessageCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('panelmessage')
        .setDescription('Affiche un message sur le panel web. (Propriétaire seulement)')
        .setDMPermission(true)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Définit ou met à jour le message du panel.')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Le contenu du message à afficher.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription("Le type d'alerte (couleur et icône).")
                        .setRequired(true)
                        .addChoices(
                            { name: 'Info (Bleu)', value: 'info' },
                            { name: 'Attention (Jaune)', value: 'warning' },
                            { name: 'Erreur (Rouge)', value: 'error' },
                            { name: 'Urgent (Rouge Vif)', value: 'urgent' },
                            { name: 'Mise à jour (Vert)', value: 'update' },
                            { name: 'Annonce (Violet)', value: 'announcement' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Efface le message actuellement affiché sur le panel.')),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID) {
            await interaction.reply({ content: 'Cette commande est exclusivement réservée au propriétaire du bot.', flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'set') {
                const message = interaction.options.getString('message', true);
                const type = interaction.options.getString('type', true) as 'info' | 'warning' | 'error' | 'urgent' | 'update' | 'announcement';
                
                setPanelMessage({
                    type: type,
                    content: message,
                    active: true
                });

                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('Message du Panel Défini')
                    .setDescription(`Le message suivant sera maintenant affiché sur toutes les pages du panel :`)
                    .addFields(
                        { name: 'Type', value: type, inline: true },
                        { name: 'Message', value: message, inline: false }
                    );

                await interaction.editReply({ embeds: [embed] });
            } else if (subcommand === 'clear') {
                setPanelMessage(null);
                await interaction.editReply({ content: '✅ Le message du panel a été effacé.' });
            }
        } catch (error) {
            console.error(`[PanelMessageCommand] Error executing subcommand ${subcommand}:`, error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de l\'exécution de cette commande.' });
        }
    },
};

export default PanelMessageCommand;
