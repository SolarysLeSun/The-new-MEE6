
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { addBotLog } from '../../api';

const OWNER_ID = '556529963877138442';

const StatusEventCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('statusevent')
        .setDescription('Ajoute un message manuel au journal d\'événements du statut. (Propriétaire seulement)')
        .setDMPermission(true)
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Le contenu du message à ajouter au journal.')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID) {
            await interaction.reply({ content: 'Cette commande est exclusivement réservée au propriétaire du bot.', flags: MessageFlags.Ephemeral });
            return;
        }

        const message = interaction.options.getString('message', true);

        try {
            addBotLog(`[Événement Manuel] ${message}`);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('Événement Manuel Ajouté au Journal')
                .setDescription(`Le message suivant a été ajouté au journal de la page de statut :`)
                .addFields({ name: 'Message', value: message });

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('[StatusEventCommand] Error executing command:', error);
            await interaction.reply({ content: 'Une erreur est survenue lors de l\'exécution de cette commande.', ephemeral: true });
        }
    },
};

export default StatusEventCommand;
