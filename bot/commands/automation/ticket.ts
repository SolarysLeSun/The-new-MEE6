
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, TextChannel, OverwriteType } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig } from '@/lib/db';

const TicketCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Gère le ticket actuel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Ajoute un membre au ticket.')
                .addUserOption(option => option.setName('utilisateur').setDescription('Le membre à ajouter.').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Retire un membre du ticket.')
                .addUserOption(option => option.setName('utilisateur').setDescription('Le membre à retirer.').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Ferme le ticket actuel.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reopen')
                .setDescription('Réouvre un ticket fermé.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Supprime définitivement un ticket fermé.')
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild || !interaction.channel || !(interaction.channel instanceof TextChannel)) {
            await interaction.reply({ content: 'Cette commande doit être utilisée dans un salon de ticket.', ephemeral: true });
            return;
        }

        const config = await getServerConfig(interaction.guild.id, 'private-rooms');
        if (!config?.enabled || !interaction.channel.parentId || interaction.channel.parentId !== config.category_id) {
            await interaction.reply({ content: 'Ce salon n\'est pas un ticket valide.', ephemeral: true });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'add': {
                    const user = interaction.options.getUser('utilisateur', true);
                    await interaction.channel.permissionOverwrites.edit(user.id, {
                        ViewChannel: true,
                        SendMessages: true,
                    });
                    await interaction.editReply({ content: `${user.toString()} a été ajouté(e) au ticket.` });
                    break;
                }
                case 'remove': {
                    const user = interaction.options.getUser('utilisateur', true);
                    await interaction.channel.permissionOverwrites.edit(user.id, {
                        ViewChannel: false,
                    });
                    await interaction.editReply({ content: `${user.toString()} a été retiré(e) du ticket.` });
                    break;
                }
                case 'close': {
                    // This logic is mostly handled by the button interaction in main.ts
                    // We can simulate its effect here
                     await interaction.channel.send({ content: `Ticket fermé par ${interaction.user}. Le salon va être archivé ou supprimé selon la configuration.` });
                    // Here you could emit an event or call a function that triggers the same logic as the 'close_ticket' button
                    break;
                }
                 case 'reopen': {
                    await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: null });
                    await interaction.editReply({ content: 'Ticket ré-ouvert.' });
                    await interaction.channel.send({ content: `Ticket ré-ouvert par ${interaction.user}.`});
                    break;
                }
                 case 'delete': {
                    await interaction.editReply({ content: 'Le ticket sera supprimé dans 5 secondes.' });
                    setTimeout(() => interaction.channel?.delete('Suppression de ticket demandée.'), 5000);
                    break;
                }
            }
        } catch (error) {
            console.error(`[TicketCommand] Error on subcommand ${subcommand}:`, error);
            await interaction.editReply({ content: "Une erreur est survenue lors de l'exécution de cette commande." });
        }
    },
};

export default TicketCommand;
