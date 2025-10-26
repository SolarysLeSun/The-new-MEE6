
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, TextChannel, User, Collection, Message } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig } from '@/lib/db';

const ClearCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('effacermessages')
        .setDescription('Supprime un nombre spécifié de messages récents.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option =>
            option.setName('nombre')
                .setDescription('Le nombre de messages à supprimer (1-100).')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription("L'utilisateur dont les messages doivent être supprimés (optionnel).")
                .setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.channel || !(interaction.channel instanceof TextChannel)) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un salon textuel.', ephemeral: true });
            return;
        }
        
        const config = await getServerConfig(interaction.guildId!, 'moderation');
        if (!config?.enabled) {
            await interaction.reply({ content: "Le module de modération est désactivé sur ce serveur.", ephemeral: true });
            return;
        }

        const amount = interaction.options.getInteger('nombre', true);
        const targetUser = interaction.options.getUser('utilisateur');

        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.channel;
        let messagesToDelete: Collection<string, Message>;

        try {
            const fetchedMessages = await channel.messages.fetch({ limit: amount });

            // Filtrer les messages de plus de 14 jours
            const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
            messagesToDelete = fetchedMessages.filter(msg => msg.createdTimestamp > fourteenDaysAgo);

            if (targetUser) {
                messagesToDelete = messagesToDelete.filter(msg => msg.author.id === targetUser.id);
            }

            if (messagesToDelete.size === 0) {
                await interaction.editReply({ content: 'Aucun message récent (moins de 14 jours) à supprimer ne correspond à vos critères.' });
                return;
            }

            const deletedMessages = await channel.bulkDelete(messagesToDelete, true);
            await interaction.editReply({ content: `✅ ${deletedMessages.size} message(s) ont été supprimé(s) avec succès.` });

        } catch (error) {
            console.error('[ClearMessages] Error:', error);
            await interaction.editReply({ content: "Une erreur est survenue. Je n'ai peut-être pas la permission de supprimer des messages ou les messages sont trop anciens." });
        }
    },
};

export default ClearCommand;
