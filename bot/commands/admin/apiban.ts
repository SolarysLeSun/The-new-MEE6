
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { addApiBan, removeApiBan, listApiBans } from '@/lib/db';

const OWNER_ID = '556529963877138442';

const ApiBanCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('apiban')
        .setDescription('Gère les bannissements de l\'API publique. (Propriétaire seulement)')
        .setDMPermission(true)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Bannit un utilisateur de l\'API publique.')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('L\'utilisateur à bannir.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('La raison du bannissement.')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Révoque le bannissement de l\'API pour un utilisateur.')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('L\'utilisateur à débannir.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Affiche la liste des utilisateurs bannis de l\'API.')),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID) {
            await interaction.reply({ content: 'Cette commande est exclusivement réservée au propriétaire du bot.', flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'add': {
                    const targetUser = interaction.options.getUser('user', true);
                    const reason = interaction.options.getString('reason');
                    addApiBan(targetUser.id, interaction.user.id, reason);
                    await interaction.editReply(`✅ L'utilisateur **${targetUser.tag}** a été banni de l'API publique.`);
                    break;
                }
                
                case 'remove': {
                    const targetUser = interaction.options.getUser('user', true);
                    removeApiBan(targetUser.id);
                    await interaction.editReply(`🗑️ Le bannissement de l'API pour **${targetUser.tag}** a été révoqué.`);
                    break;
                }

                case 'list': {
                    const bannedUsers = listApiBans();
                    if (bannedUsers.length === 0) {
                        await interaction.editReply("Aucun utilisateur n'est banni de l'API.");
                        return;
                    }

                    const userList = await Promise.all(bannedUsers.map(async (ban) => {
                        try {
                            const user = await interaction.client.users.fetch(ban.user_id);
                            return `**${user.tag}** (\`${ban.user_id}\`)\n*Raison:* ${ban.reason || 'Aucune'}`;
                        } catch {
                            return `**Utilisateur Inconnu** (\`${ban.user_id}\`)\n*Raison:* ${ban.reason || 'Aucune'}`;
                        }
                    }));
                    
                    const embed = new EmbedBuilder()
                        .setTitle('Utilisateurs Bannis de l\'API')
                        .setDescription(userList.join('\n\n'))
                        .setColor(0xFF0000);
                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
            }
        } catch (error) {
            console.error(`[ApiBanCommand] Error executing subcommand ${subcommand}:`, error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de l\'exécution de cette commande.' });
        }
    },
};

export default ApiBanCommand;
