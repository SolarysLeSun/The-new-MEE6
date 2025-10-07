
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { addDevGuild, removeDevGuild, getDevGuilds } from '@/lib/db';

const OWNER_ID = '556529963877138442';

const DevServerCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('devserver')
        .setDescription('Gère la liste des serveurs de développement. (Propriétaire seulement)')
        .setDMPermission(true)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Ajoute un serveur à la liste de diffusion des annonces de dev.')
                .addStringOption(option =>
                    option.setName('guild_id')
                        .setDescription("L'ID du serveur à ajouter.")
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Retire un serveur de la liste de diffusion des annonces de dev.')
                .addStringOption(option =>
                    option.setName('guild_id')
                        .setDescription("L'ID du serveur à retirer.")
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Affiche la liste des serveurs de développement configurés.')),

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
                    const guildId = interaction.options.getString('guild_id', true);
                    addDevGuild(guildId);
                    await interaction.editReply(`✅ Le serveur avec l'ID \`${guildId}\` a été ajouté à la liste de développement.`);
                    break;
                }
                
                case 'remove': {
                    const guildId = interaction.options.getString('guild_id', true);
                    removeDevGuild(guildId);
                    await interaction.editReply(`🗑️ Le serveur avec l'ID \`${guildId}\` a été retiré de la liste de développement.`);
                    break;
                }

                case 'list': {
                    const guildIds = getDevGuilds();
                    if (guildIds.length === 0) {
                        await interaction.editReply("Aucun serveur de développement n'est configuré.");
                        return;
                    }

                    // Fetch guild names for a more readable list
                    const guildNames = await Promise.all(guildIds.map(async (id) => {
                        try {
                            const guild = await interaction.client.guilds.fetch(id);
                            return `**${guild.name}** (\`${id}\`)`;
                        } catch {
                            return `Serveur Inconnu (\`${id}\`)`;
                        }
                    }));
                    
                    const embed = new EmbedBuilder()
                        .setTitle('Serveurs de Développement Configurés')
                        .setDescription(guildNames.join('\n') || 'Aucun')
                        .setColor(0x00BFFF);
                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
            }
        } catch (error) {
            console.error(`[DevServerCommand] Error executing subcommand ${subcommand}:`, error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de l\'exécution de cette commande.' });
        }
    },
};

export default DevServerCommand;
