
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command, Affinity } from '@/types';
import { getServerConfig, getTopAffinitiesForGuild, getTopAffinitiesForUser } from '@/lib/db';

const AffinitesCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('affinites')
        .setDescription('Affiche les scores d\'affinité entre les membres.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('top')
                .setDescription('Affiche le classement des plus grandes affinités du serveur.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Affiche les affinités d\'un utilisateur spécifique.')
                .addUserOption(option =>
                    option.setName('utilisateur')
                        .setDescription('L\'utilisateur à inspecter (par défaut: vous-même).'))),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', ephemeral: true });
            return;
        }

        const config = await getServerConfig(interaction.guild.id, 'affinites');
        if (!config?.enabled) {
            await interaction.reply({ content: "Le module d'affinités est désactivé sur ce serveur.", ephemeral: true });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });
        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'top') {
                const topPairs = getTopAffinitiesForGuild(interaction.guild.id, 10);
                if (topPairs.length === 0) {
                    await interaction.editReply("Aucune affinité enregistrée pour l'instant.");
                    return;
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0xFF69B4)
                    .setTitle(`💖 Top des Affinités sur ${interaction.guild.name}`)
                    .setDescription(
                        await Promise.all(topPairs.map(async (pair, index) => {
                            const user1 = await interaction.client.users.fetch(pair.user1_id).catch(() => ({ tag: 'Utilisateur Inconnu' }));
                            const user2 = await interaction.client.users.fetch(pair.user2_id).catch(() => ({ tag: 'Utilisateur Inconnu' }));
                            return `**#${index + 1}:** ${user1.tag} & ${user2.tag} - **${pair.score} points**`;
                        })).then(lines => lines.join('\n'))
                    );
                
                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'user') {
                const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
                const userAffinities = getTopAffinitiesForUser(interaction.guild.id, targetUser.id, 5);

                if (userAffinities.length === 0) {
                    await interaction.editReply(`**${targetUser.username}** n'a pas encore d'affinités notables.`);
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor(0xFF69B4)
                    .setTitle(`Top 5 des Affinités de ${targetUser.username}`)
                    .setDescription(
                        await Promise.all(userAffinities.map(async (pair) => {
                             const otherUserId = pair.user1_id === targetUser.id ? pair.user2_id : pair.user1_id;
                             const otherUser = await interaction.client.users.fetch(otherUserId).catch(() => ({ tag: 'Utilisateur Inconnu' }));
                             return `Avec **${otherUser.tag}** : **${pair.score} points**`;
                        })).then(lines => lines.join('\n'))
                    )
                    .setThumbnail(targetUser.displayAvatarURL());
                    
                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('[AffinitesCommand] Error:', error);
            await interaction.editReply("Une erreur est survenue lors de la récupération des affinités.");
        }
    },
};

export default AffinitesCommand;
