
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, TextChannel, ThreadChannel, GuildMember } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, getTicketByChannelId, updateTicket } from '@/lib/db';

const TicketCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Gère un salon de ticket.')
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Ajoute un utilisateur au ticket.')
                .addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur à ajouter.').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Retire un utilisateur du ticket.')
                .addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur à retirer.').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Ferme le ticket actuel.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reopen')
                .setDescription('Réouvre un ticket fermé.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Affiche le statut du ticket actuel.')),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild || !interaction.channel || !(interaction.channel instanceof TextChannel)) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un salon de ticket.', ephemeral: true });
            return;
        }

        const config = await getServerConfig(interaction.guild.id, 'private-rooms');
        if (!config?.enabled) {
            await interaction.reply({ content: 'Le système de tickets est désactivé.', ephemeral: true });
            return;
        }

        const ticket = getTicketByChannelId(interaction.channel.id);
        if (!ticket) {
            await interaction.reply({ content: 'Ce salon n\'est pas un ticket valide.', ephemeral: true });
            return;
        }
        
        const member = interaction.member as GuildMember;
        const isModerator = member.roles.cache.some(r => config.moderator_roles.includes(r.id)) || member.permissions.has(PermissionFlagsBits.Administrator);
        const isOwner = ticket.owner_id === member.id;

        if (!isModerator && !isOwner) {
            await interaction.reply({ content: "Vous n'avez pas la permission d'utiliser cette commande ici.", ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'add':
                case 'remove': {
                    const targetUser = interaction.options.getUser('utilisateur', true);
                    const action = subcommand === 'add' ? 'ajouté' : 'retiré';
                    
                    await interaction.channel.permissionOverwrites.edit(targetUser.id, {
                        ViewChannel: subcommand === 'add' ? true : false,
                    });
                    
                    const currentMembers = ticket.members || [];
                    const newMembers = subcommand === 'add'
                        ? [...new Set([...currentMembers, targetUser.id])]
                        : currentMembers.filter(id => id !== targetUser.id);
                    
                    updateTicket(ticket.channel_id, { members: newMembers });
                    
                    await interaction.editReply(`✅ **${targetUser.tag}** a été ${action} du ticket.`);
                    interaction.client.emit('ticketMemberUpdate', ticket, targetUser, action, interaction.user);
                    break;
                }
                case 'close': {
                    if (ticket.status === 'closed') {
                        await interaction.editReply('Ce ticket est déjà fermé.');
                        return;
                    }
                    updateTicket(ticket.channel_id, { status: 'closed', closed_at: new Date().toISOString() });
                    await interaction.editReply('Le ticket a été fermé.');
                    interaction.client.emit('ticketStatusUpdate', ticket, 'closed', interaction.user);
                    break;
                }
                 case 'reopen': {
                    if (ticket.status !== 'closed') {
                        await interaction.editReply('Ce ticket n\'est pas fermé.');
                        return;
                    }
                    updateTicket(ticket.channel_id, { status: 'open', closed_at: null, claimed_by: null });
                    await interaction.editReply('Le ticket a été ré-ouvert.');
                    interaction.client.emit('ticketStatusUpdate', ticket, 'reopened', interaction.user);
                    break;
                }
                 case 'status': {
                    const owner = await interaction.client.users.fetch(ticket.owner_id).catch(() => ({ tag: 'Inconnu' }));
                    const members = await Promise.all((ticket.members || []).map(id => interaction.client.users.fetch(id).catch(() => ({ tag: 'Inconnu' }))));
                    const thread = interaction.channel.threads.cache.find(t => t.name.startsWith('staff-'));

                    const embed = new EmbedBuilder()
                        .setColor(ticket.status === 'open' ? 0x57F287 : 0xED4245)
                        .setTitle(`Statut du Ticket #${interaction.channel.name}`)
                        .addFields(
                            { name: 'Statut', value: ticket.status === 'open' ? '🟢 Ouvert' : '🔴 Fermé', inline: true },
                            { name: 'Créateur', value: owner.tag, inline: true },
                            { name: 'Créé le', value: `<t:${Math.floor(new Date(ticket.created_at).getTime() / 1000)}:f>`, inline: false },
                            { name: 'Membres Ajoutés', value: members.length > 0 ? members.map(m => m.tag).join(', ') : 'Aucun', inline: false }
                        );
                    
                    if (thread) {
                        embed.addFields({ name: 'Fil de discussion interne', value: `${thread.toString()}`, inline: false });
                    }

                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
            }
        } catch (error) {
            console.error(`[TicketCommand] Error processing subcommand ${subcommand}:`, error);
            await interaction.editReply({ content: 'Une erreur est survenue.' });
        }
    },
};

export default TicketCommand;
