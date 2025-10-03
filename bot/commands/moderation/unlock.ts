
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, TextChannel, ChatInputCommandInteraction, MessageFlags, OverwriteResolvable } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, unlockChannel, isChannelLocked } from '@/lib/db';

const UnlockCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Déverrouille un salon précédemment verrouillé.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Le salon à déverrouiller. Par défaut, le salon actuel.')
                .addChannelTypes(ChannelType.GuildText)
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
        
        if (!isChannelLocked(channel.id)) {
            await interaction.editReply({ content: `Le salon ${channel} n'est pas verrouillé par le bot.` });
            return;
        }

        try {
            const originalPermissionsJSON = unlockChannel(channel.id);
            if (!originalPermissionsJSON) {
                 await interaction.editReply({ content: `Impossible de trouver la sauvegarde des permissions pour ${channel}.` });
                 return;
            }
            
            const originalPermissions = JSON.parse(originalPermissionsJSON) as OverwriteResolvable[];
            
            // This will overwrite all existing permissions with the saved ones.
            await channel.permissionOverwrites.set(originalPermissions);

            await interaction.editReply({ content: `Le salon ${channel} a été déverrouillé.` });
            await channel.send(`🔓 **Salon déverrouillé** par ${interaction.user.toString()}.`);

        } catch (error) {
            console.error('Erreur lors du déverrouillage du salon:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors du déverrouillage du salon.' });
        }
    },
};

export default UnlockCommand;
