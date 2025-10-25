
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, GuildMember, Role, MessageFlags, TextChannel } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig } from '@/lib/db';
import ms from 'ms';

const TempRoleCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('temprole')
        .setDescription('Attribue un rôle à un utilisateur pour une durée déterminée.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription("L'utilisateur à qui attribuer le rôle.")
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Le rôle à attribuer temporairement.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duree')
                .setDescription('La durée pendant laquelle le rôle sera attribué (ex: 10m, 1h, 7d).')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande doit être utilisée dans un serveur.', ephemeral: true });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('utilisateur', true);
        const role = interaction.options.getRole('role', true) as Role;
        const durationStr = interaction.options.getString('duree', true);
        const moderator = interaction.user;

        const durationMs = ms(durationStr);
        if (!durationMs || durationMs <= 0) {
            await interaction.editReply({ content: 'Format de durée invalide. Utilisez par exemple: `10m`, `1h`, `7d`.' });
            return;
        }

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
            await interaction.editReply({ content: "Cet utilisateur n'est pas sur le serveur." });
            return;
        }

        if (role.position >= interaction.guild.members.me!.roles.highest.position) {
            await interaction.editReply({ content: "Je ne peux pas attribuer ce rôle car il est plus élevé ou égal à mon propre rôle." });
            return;
        }

        if (targetMember.roles.cache.has(role.id)) {
            await interaction.editReply({ content: "Cet utilisateur possède déjà ce rôle." });
            return;
        }

        try {
            await targetMember.roles.add(role, `Rôle temporaire ajouté par ${moderator.tag}`);
            
            const expiresAt = new Date(Date.now() + durationMs);
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('Rôle Temporaire Attribué')
                .setDescription(`Le rôle ${role} a été donné à ${targetUser.toString()} pour une durée de **${durationStr}**.\nIl expirera <t:${Math.floor(expiresAt.getTime() / 1000)}:R>.`);
            
            await interaction.editReply({ embeds: [embed] });

            // Log
            const config = await getServerConfig(interaction.guild.id, 'moderation');
            if (config?.log_channel_id) {
                const logChannel = interaction.guild.channels.cache.get(config.log_channel_id as string) as TextChannel;
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(0x00BFFF)
                        .setTitle('Action de Modération : Rôle Temporaire')
                        .addFields(
                            { name: 'Utilisateur', value: `${targetUser.tag} (${targetUser.id})` },
                            { name: 'Modérateur', value: `${moderator.tag} (${moderator.id})` },
                            { name: 'Rôle', value: role.name },
                            { name: 'Durée', value: durationStr }
                        )
                        .setTimestamp();
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
            
            // Schedule role removal
            setTimeout(async () => {
                try {
                    const freshMember = await interaction.guild!.members.fetch(targetUser.id).catch(() => null);
                    if (freshMember && freshMember.roles.cache.has(role.id)) {
                        await freshMember.roles.remove(role, 'Le rôle temporaire a expiré.');
                        console.log(`[TempRole] Rôle "${role.name}" retiré de ${targetUser.tag} sur le serveur ${interaction.guild!.name}.`);
                    }
                } catch (error) {
                    console.error(`[TempRole] Erreur lors du retrait du rôle temporaire pour ${targetUser.tag}:`, error);
                }
            }, durationMs);

        } catch (error) {
            console.error('[TempRole] Erreur lors de l\'attribution du rôle:', error);
            await interaction.editReply({ content: "Une erreur est survenue. Vérifiez mes permissions et la hiérarchie des rôles." });
        }
    },
};

export default TempRoleCommand;
