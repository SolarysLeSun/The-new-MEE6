
import { ContextMenuCommandBuilder, ApplicationCommandType, MessageContextMenuCommandInteraction, EmbedBuilder, PermissionFlagsBits, TextChannel, GuildMember } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, recordSanction } from '@/lib/db';

const WarnForMessageCommand: Command = {
    data: new ContextMenuCommandBuilder()
        .setName('Avertir pour ce message')
        .setType(ApplicationCommandType.Message)
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction: MessageContextMenuCommandInteraction) {
        if (!interaction.guild || !interaction.targetMessage.author || interaction.targetMessage.author.bot) {
            await interaction.reply({ content: "Cette action n'est pas possible.", ephemeral: true });
            return;
        }

        const config = await getServerConfig(interaction.guild.id, 'moderation');
        if (!config?.enabled) {
            await interaction.reply({ content: "Le module de modération est désactivé sur ce serveur.", ephemeral: true });
            return;
        }
        
        const targetUser = interaction.targetMessage.author;
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null) as GuildMember;
        const moderator = interaction.user;
        
        if (!targetMember) {
             await interaction.reply({ content: "L'auteur du message n'est plus sur le serveur.", ephemeral: true });
             return;
        }
        
        const reason = `Pour le message: "${interaction.targetMessage.content.substring(0, 500)}"`;

        recordSanction({
            guild_id: interaction.guild.id,
            user_id: targetUser.id,
            moderator_id: moderator.id,
            action_type: 'warn',
            reason: reason
        });
        
        await interaction.reply({ content: `✅ **${targetUser.tag}** a été averti(e).`, ephemeral: true });

        // Log
        if (config.log_channel_id) {
            const logChannel = interaction.guild.channels.cache.get(config.log_channel_id as string) as TextChannel;
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0xFF4500)
                    .setTitle('Action de Modération : Avertissement')
                    .addFields(
                        { name: 'Utilisateur', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
                        { name: 'Modérateur', value: `${moderator.tag} (${moderator.id})`, inline: false },
                        { name: 'Raison', value: reason, inline: false },
                        { name: 'Message original', value: `[Cliquer pour voir](${interaction.targetMessage.url})`, inline: false },
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        }
    }
};

export default WarnForMessageCommand;
