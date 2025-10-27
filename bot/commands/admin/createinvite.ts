
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, TextChannel, ChannelType } from 'discord.js';
import type { Command } from '@/types';

const OWNER_ID = '556529963877138442';

const CreateInviteCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('createinvite')
        .setDescription('Crée une invitation pour un serveur spécifié. (Propriétaire seulement)')
        .setDMPermission(true)
        .addStringOption(option =>
            option.setName('guild_id')
                .setDescription("L'ID du serveur pour lequel créer une invitation.")
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID) {
            await interaction.reply({ content: 'Cette commande est exclusivement réservée au propriétaire du bot.', flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const guildId = interaction.options.getString('guild_id', true);

        try {
            const guild = await interaction.client.guilds.fetch(guildId);
            if (!guild) {
                await interaction.editReply({ content: `Impossible de trouver le serveur avec l'ID \`${guildId}\`.` });
                return;
            }

            // Find a suitable channel to create an invite for
            const channel = guild.channels.cache.find(
                c => c.type === ChannelType.GuildText && 
                c.permissionsFor(guild.members.me!)?.has('CreateInstantInvite')
            ) as TextChannel;

            if (!channel) {
                await interaction.editReply({ content: "Aucun salon textuel trouvé avec les permissions nécessaires pour créer une invitation." });
                return;
            }

            const invite = await channel.createInvite({
                maxAge: 3600, // 1 hour
                maxUses: 1,
                reason: `Invitation créée par le propriétaire du bot (${interaction.user.tag})`
            });

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle(`🔗 Invitation créée pour ${guild.name}`)
                .setDescription(`Voici votre lien d'invitation (valide 1 heure, 1 utilisation) :\n\n**${invite.url}**`);

            await interaction.editReply({ embeds: [embed] });

        } catch (error: any) {
            console.error(`[CreateInviteCommand] Error:`, error);
            if (error.code === 10004) { // Unknown Guild
                 await interaction.editReply({ content: `Erreur : Le serveur avec l'ID \`${guildId}\` est introuvable. Le bot n'est peut-être plus dessus.` });
            } else {
                await interaction.editReply({ content: 'Une erreur est survenue lors de la création de l\'invitation.' });
            }
        }
    },
};

export default CreateInviteCommand;
