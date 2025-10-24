
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, User } from 'discord.js';
import type { Command } from '@/types';
import { grantPermission, revokePermission, hasPermission, getDelegatedUsersForPermission } from '@/lib/db';

const OWNER_ID = '556529963877138442';
const AVAILABLE_PERMISSIONS = ['genpremium', 'system'];

const DelegateCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('delegate')
        .setDescription('Délègue des permissions de commandes propriétaires. (Propriétaire seulement)')
        .setDMPermission(true)
        .addSubcommand(subcommand =>
            subcommand
                .setName('grant')
                .setDescription('Accorde une permission à un utilisateur.')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('L\'utilisateur à qui accorder la permission.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('permission')
                        .setDescription('La permission à accorder.')
                        .setRequired(true)
                        .addChoices(...AVAILABLE_PERMISSIONS.map(p => ({ name: p, value: p })))))
        .addSubcommand(subcommand =>
            subcommand
                .setName('revoke')
                .setDescription('Révoque une permission d\'un utilisateur.')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('L\'utilisateur à qui retirer la permission.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('permission')
                        .setDescription('La permission à retirer.')
                        .setRequired(true)
                        .addChoices(...AVAILABLE_PERMISSIONS.map(p => ({ name: p, value: p })))))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Liste les utilisateurs ayant une permission spécifique.')
                .addStringOption(option =>
                    option.setName('permission')
                        .setDescription('La permission à vérifier.')
                        .setRequired(true)
                        .addChoices(...AVAILABLE_PERMISSIONS.map(p => ({ name: p, value: p })))))
        .addSubcommand(subcommand =>
            subcommand
                .setName('check')
                .setDescription('Vérifie si un utilisateur a une permission.')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('L\'utilisateur à vérifier.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('permission')
                        .setDescription('La permission à vérifier.')
                        .setRequired(true)
                        .addChoices(...AVAILABLE_PERMISSIONS.map(p => ({ name: p, value: p }))))),


    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID) {
            await interaction.reply({ content: 'Cette commande est exclusivement réservée au propriétaire du bot.', flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        const permission = interaction.options.getString('permission', true) as 'genpremium' | 'system';
        const targetUser = interaction.options.getUser('user');

        try {
            switch (subcommand) {
                case 'grant':
                    if (!targetUser) return;
                    grantPermission(targetUser.id, permission, interaction.user.id);
                    await interaction.editReply(`✅ La permission \`${permission}\` a été accordée à **${targetUser.tag}**.`);
                    break;
                
                case 'revoke':
                    if (!targetUser) return;
                    revokePermission(targetUser.id, permission);
                    await interaction.editReply(`🗑️ La permission \`${permission}\` a été révoquée pour **${targetUser.tag}**.`);
                    break;

                case 'list': {
                    const userIds = getDelegatedUsersForPermission(permission);
                    if (userIds.length === 0) {
                        await interaction.editReply(`Aucun utilisateur n'a la permission \`${permission}\`.`);
                        return;
                    }
                    // Fetch user tags, this might be slow for many users
                    const userTags = await Promise.all(userIds.map(async (id) => {
                        try {
                            const user = await interaction.client.users.fetch(id);
                            return `${user.tag} (\`${id}\`)`;
                        } catch {
                            return `Utilisateur Inconnu (\`${id}\`)`;
                        }
                    }));
                    const embed = new EmbedBuilder()
                        .setTitle(`Utilisateurs avec la permission : \`${permission}\``)
                        .setDescription(userTags.join('\n'))
                        .setColor(0x00BFFF);
                    await interaction.editReply({ embeds: [embed] });
                    break;
                }

                case 'check': {
                    if (!targetUser) return;
                    const hasPerm = hasPermission(targetUser.id, permission);
                     const embed = new EmbedBuilder()
                        .setTitle(`Vérification de Permission`)
                        .setDescription(`L'utilisateur **${targetUser.tag}** ${hasPerm ? 'possède' : 'ne possède pas'} la permission \`${permission}\`.`)
                        .setColor(hasPerm ? 0x00FF00 : 0xFF0000);
                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
            }
        } catch (error) {
            console.error(`[DelegateCommand] Error executing subcommand ${subcommand}:`, error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de l\'exécution de cette commande.' });
        }
    },
};

export default DelegateCommand;
