
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, ChannelType, TextChannel, Role } from 'discord.js';
import type { Command, ModuleConfig } from '@/types';
import { getServerConfig, updateServerConfig, redeemPremiumKey } from '@/lib/db';

const SetCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('set')
        .setDescription('Configure rapidement les paramètres essentiels du bot.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('log-channel')
                .setDescription('Définit le salon où les logs de modération seront envoyés.')
                .addChannelOption(option =>
                    option.setName('salon')
                        .setDescription('Le salon textuel pour les logs.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('suggestion-channel')
                .setDescription('Définit le salon où les suggestions seront envoyées.')
                .addChannelOption(option =>
                    option.setName('salon')
                        .setDescription('Le salon textuel pour les suggestions.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel-access')
                .setDescription('Gère qui peut accéder au panel de configuration. (Propriétaire seulement)')
                .addRoleOption(option => option.setName('allow_role').setDescription('Rôle autorisé à accéder au panel.').setRequired(false))
                .addUserOption(option => option.setName('allow_user').setDescription('Utilisateur autorisé à accéder au panel.').setRequired(false))
                .addRoleOption(option => option.setName('deny_role').setDescription('Rôle interdit d\'accéder au panel.').setRequired(false))
                .addUserOption(option => option.setName('deny_user').setDescription('Utilisateur interdit d\'accéder au panel.').setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('premium-key')
                .setDescription('Active le statut Premium sur ce serveur avec une clé.')
                .addStringOption(option =>
                    option.setName('clé')
                        .setDescription('La clé d\'activation premium fournie par le développeur.')
                        .setRequired(true))),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ ephemeral: true });
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'log-channel': {
                    const channel = interaction.options.getChannel('salon', true) as TextChannel;
                    const modConfig = await getServerConfig(interaction.guild.id, 'moderation');
                    const logsConfig = await getServerConfig(interaction.guild.id, 'logs');

                    if (modConfig) await updateServerConfig(interaction.guild.id, 'moderation', { ...modConfig, log_channel_id: channel.id });
                    if (logsConfig) await updateServerConfig(interaction.guild.id, 'logs', { ...logsConfig, log_channel_id: channel.id });
                    
                    await interaction.editReply({ content: `✅ Le salon des logs a été défini sur ${channel}.` });
                    break;
                }

                case 'suggestion-channel': {
                    const channel = interaction.options.getChannel('salon', true) as TextChannel;
                    const suggestionsConfig = await getServerConfig(interaction.guild.id, 'suggestions');
                    if (suggestionsConfig) {
                        await updateServerConfig(interaction.guild.id, 'suggestions', { ...suggestionsConfig, suggestion_channel_id: channel.id });
                        await interaction.editReply({ content: `✅ Le salon de suggestions a été défini sur ${channel}.` });
                    }
                    break;
                }

                case 'panel-access': {
                    if (interaction.user.id !== interaction.guild.ownerId) {
                        await interaction.editReply({ content: 'Seul le propriétaire du serveur peut utiliser cette commande.', flags: MessageFlags.Ephemeral });
                        return;
                    }

                    const config = await getServerConfig(interaction.guild.id, 'panel-access') || defaultConfigs['panel-access'] as ModuleConfig;
                    
                    const allowedRole = interaction.options.getRole('allow_role') as Role;
                    const allowedUser = interaction.options.getUser('allow_user');
                    const deniedRole = interaction.options.getRole('deny_role') as Role;
                    const deniedUser = interaction.options.getUser('deny_user');

                    const newConfig = { ...config };

                    if (allowedRole) newConfig.allowed_roles = [allowedRole.id];
                    if (allowedUser) newConfig.allowed_users = [allowedUser.id];
                    if (deniedRole) newConfig.denied_roles = [deniedRole.id];
                    if (deniedUser) newConfig.denied_users = [deniedUser.id];

                    await updateServerConfig(interaction.guild.id, 'panel-access', newConfig);

                    await interaction.editReply({ content: 'Les permissions d\'accès au panel ont été mises à jour.' });
                    break;
                }

                case 'premium-key': {
                    const key = interaction.options.getString('clé', true);
                    const result = redeemPremiumKey(key, interaction.guild.id);
                    
                    if (result.success) {
                        const embed = new EmbedBuilder()
                            .setColor(0xFFD700)
                            .setTitle('🎉 Premium Activé ! 🎉')
                            .setDescription('Ce serveur a maintenant accès à toutes les fonctionnalités premium. Merci pour votre soutien !')
                            .setTimestamp();
                        await interaction.editReply({ embeds: [embed] });
                    } else {
                        const embed = new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle('❌ Erreur d\'activation')
                            .setDescription(result.message);
                        await interaction.editReply({ embeds: [embed] });
                    }
                    break;
                }
            }
        } catch (error) {
            console.error(`[SetCommand] Error executing subcommand ${subcommand}:`, error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de la configuration.' });
        }
    },
};

const defaultConfigs = {
    'panel-access': {
        enabled: true,
        allowed_roles: [],
        denied_roles: [],
        allowed_users: [],
        denied_users: [],
    },
};

export default SetCommand;
