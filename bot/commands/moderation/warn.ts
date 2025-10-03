

import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, TextChannel, GuildMember, MessageFlags } from 'discord.js';
import type { Command, AutoSanction } from '../../../src/types';
import { getServerConfig, recordSanction, getUserSanctionHistory } from '../../../src/lib/db';
import ms from 'ms';

const WarnCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Avertit un utilisateur.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription("L'utilisateur à avertir.")
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription("La raison de l'avertissement.")
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', flags: MessageFlags.Ephemeral });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });

        const config = await getServerConfig(interaction.guild.id, 'moderation');
        if (!config?.enabled) {
            await interaction.editReply({ content: "Le module de modération est désactivé sur ce serveur." });
            return;
        }

        const targetUser = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason', true);
        const moderator = interaction.user;

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
             await interaction.editReply({ content: 'Cet utilisateur n\'est pas sur le serveur.' });
             return;
        }
        
        if (targetUser.id === moderator.id) {
            await interaction.editReply({ content: 'Vous ne pouvez pas vous avertir vous-même.' });
            return;
        }

        if (interaction.member && 'roles' in interaction.member) {
            const moderatorMember = interaction.member as GuildMember;
            if (targetMember.roles.highest.position >= moderatorMember.roles.highest.position) {
                 await interaction.editReply({ content: 'Vous ne pouvez pas avertir un membre avec un rôle égal ou supérieur au vôtre.' });
                 return;
            }
        }
        
        try {
            // Record the sanction
            recordSanction({
                guild_id: interaction.guild.id,
                user_id: targetUser.id,
                moderator_id: moderator.id,
                action_type: 'warn',
                reason: reason
            });

             const replyEmbed = new EmbedBuilder()
                .setColor(0xFFFF00) // Yellow
                .setDescription(`✅ **${targetUser.tag}** a été averti pour la raison : *${reason}*.`);
            
            await interaction.editReply({ embeds: [replyEmbed] });

            // Notify user
            if (config.dm_user_on_action) {
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setColor(0xFFFF00) // Yellow
                        .setTitle(`Vous avez reçu un avertissement sur ${interaction.guild.name}`)
                        .addFields(
                            { name: 'Raison', value: reason },
                            { name: 'Averti par', value: moderator.tag }
                        )
                        .setTimestamp();
                    await targetUser.send({ embeds: [dmEmbed] });
                } catch (error) {
                    console.warn(`[Warn] Impossible d'envoyer un DM à ${targetUser.tag}.`);
                }
            }

            // Log the action
            const logChannel = config.log_channel_id 
                ? await interaction.guild.channels.fetch(config.log_channel_id).catch(() => null) as TextChannel
                : null;
            
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0xFF4500)
                    .setTitle('Action de Modération : Avertissement')
                    .addFields(
                        { name: 'Utilisateur', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
                        { name: 'Modérateur', value: `${moderator.tag} (${moderator.id})`, inline: false },
                        { name: 'Raison', value: reason, inline: false }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'ID de l\'utilisateur: ' + targetUser.id });
                
                await logChannel.send({ embeds: [logEmbed] });
            }

            // Check for auto-sanctions
            await checkAutoSanctions(interaction, targetMember, config, logChannel);

        } catch (error) {
            console.error('[Warn] Error during warn:', error);
            await interaction.editReply({ content: `Une erreur est survenue lors de l'avertissement de **${targetUser.tag}**.` });
        }
    },
};

async function checkAutoSanctions(interaction: ChatInputCommandInteraction, member: GuildMember, config: any, logChannel: TextChannel | null) {
    if (!config.auto_sanctions || config.auto_sanctions.length === 0) return;

    const history = getUserSanctionHistory(member.guild.id, member.id);
    const warnCount = history.filter(s => s.action_type === 'warn').length;

    // Sort sanctions by warn_count descending to apply the highest one
    const sortedSanctions = [...config.auto_sanctions].sort((a, b) => b.warn_count - a.warn_count);

    for (const sanction of sortedSanctions) {
        if (warnCount >= sanction.warn_count) {
            const sanctionReason = `Sanction automatique : Atteinte de ${sanction.warn_count} avertissements.`;
            let executedAction = false;
            
            try {
                switch (sanction.action) {
                    case 'mute':
                        const durationMs = ms(sanction.duration || '10m');
                        if (member.moderatable && !member.isCommunicationDisabled()) {
                            await member.timeout(durationMs, sanctionReason);
                            executedAction = true;
                        }
                        break;
                    case 'kick':
                        if (member.kickable) {
                            await member.kick(sanctionReason);
                            executedAction = true;
                        }
                        break;
                    case 'ban':
                        if (memberbannable) {
                            await member.ban({ reason: sanctionReason });
                            executedAction = true;
                        }
                        break;
                }

                if (executedAction) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('Sanction Automatique Appliquée')
                        .addFields(
                            { name: 'Utilisateur', value: `${member.user.tag} (${member.id})`, inline: false },
                            { name: 'Action', value: `${sanction.action} ${sanction.duration ? `(${sanction.duration})` : ''}`, inline: true },
                            { name: 'Seuil Atteint', value: `${warnCount}/${sanction.warn_count} avertissements`, inline: true },
                            { name: 'Raison', value: sanctionReason, inline: false }
                        )
                        .setTimestamp();

                    if (logChannel) {
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                     try {
                        const dmEmbed = new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle(`Sanction automatique sur ${member.guild.name}`)
                            .setDescription(sanctionReason)
                            .addFields({ name: 'Action', value: `${sanction.action} ${sanction.duration ? `pour ${sanction.duration}` : ''}`});
                        await member.send({ embeds: [dmEmbed] });
                    } catch (dmError) {
                        console.warn(`[AutoSanction] Impossible d'envoyer un DM à ${member.user.tag}.`);
                    }
                }
            } catch (error) {
                 console.error(`[AutoSanction] Failed to apply action '${sanction.action}' to ${member.user.tag}:`, error);
            }
            // Stop after applying the first matching sanction
            return; 
        }
    }
}


export default WarnCommand;
