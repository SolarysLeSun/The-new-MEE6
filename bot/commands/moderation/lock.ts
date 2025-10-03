
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, TextChannel, ChatInputCommandInteraction, MessageFlags, OverwriteResolvable, Collection, Role } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, lockChannel, isChannelLocked } from '@/lib/db';

const LockCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Verrouille un salon, empêchant les non-modérateurs de parler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Le salon à verrouiller. Par défaut, le salon actuel.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Raison du verrouillage (affichée dans le salon).')
                .setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', flags: MessageFlags.Ephemeral });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });

        const config = await getServerConfig(interaction.guild.id, 'lock');
        if (!config?.enabled) {
            await interaction.editReply({ content: "Le module de verrouillage est désactivé sur ce serveur." });
            return;
        }

        const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;
        const reason = interaction.options.getString('reason') || 'Aucune raison spécifiée.';
        
        if (isChannelLocked(channel.id)) {
            await interaction.editReply({ content: `Le salon ${channel} est déjà verrouillé.` });
            return;
        }

        try {
            // 1. Save original permissions
            const originalPermissions = channel.permissionOverwrites.cache.map(overwrite => ({
                id: overwrite.id,
                type: overwrite.type,
                allow: overwrite.allow.bitfield.toString(),
                deny: overwrite.deny.bitfield.toString()
            }));
            lockChannel(channel.id, JSON.stringify(originalPermissions));

            // 2. Apply new permissions
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: false,
            });

            await interaction.editReply({ content: `Le salon ${channel} a été verrouillé.` });
            await channel.send(`🔒 **Salon verrouillé** par ${interaction.user.toString()}.\nRaison : ${reason}`);

        } catch (error) {
            console.error('Erreur lors du verrouillage du salon:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors du verrouillage du salon.' });
        }
    },
};

export default LockCommand;
