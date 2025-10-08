
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { addBotBan, removeBotBan, listBotBans } from '@/lib/db';

const OWNER_ID = '556529963877138442';

const BotBanCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('botban')
        .setDescription('Gère la liste des utilisateurs bannis du bot. (Propriétaire seulement)')
        .setDMPermission(true)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Bannit un utilisateur de l\'utilisation du bot.')
                .addStringOption(option =>
                    option.setName('user_id')
                        .setDescription('L\'ID de l\'utilisateur à bannir.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('La raison du bannissement.')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Révoque le bannissement d\'un utilisateur.')
                .addStringOption(option =>
                    option.setName('user_id')
                        .setDescription('L\'ID de l\'utilisateur à débannir.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Affiche la liste des utilisateurs bannis.')),

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
                    const userId = interaction.options.getString('user_id', true);
                    const reason = interaction.options.getString('reason');
                    addBotBan(userId, interaction.user.id, reason);
                    await interaction.editReply(`✅ L'utilisateur avec l'ID \`${userId}\` a été banni de l'utilisation du bot.`);
                    break;
                }
                
                case 'remove': {
                    const userId = interaction.options.getString('user_id', true);
                    removeBotBan(userId);
                    await interaction.editReply(`🗑️ Le bannissement de l'utilisateur avec l'ID \`${userId}\` a été révoqué.`);
                    break;
                }

                case 'list': {
                    const bannedUsers = listBotBans();
                    if (bannedUsers.length === 0) {
                        await interaction.editReply("Aucun utilisateur n'est banni du bot.");
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
                        .setTitle('Utilisateurs Bannis du Bot')
                        .setDescription(userList.join('\n\n'))
                        .setColor(0xFF0000);
                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
            }
        } catch (error) {
            console.error(`[BotBanCommand] Error executing subcommand ${subcommand}:`, error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de l\'exécution de cette commande.' });
        }
    },
};

export default BotBanCommand;
