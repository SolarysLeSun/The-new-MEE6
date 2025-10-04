
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, TextChannel, GuildMember, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, recordSanction } from '@/lib/db';

const KickVocCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('kickvoc')
        .setDescription('Déconnecte un utilisateur de son salon vocal.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription("L'utilisateur à déconnecter.")
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('La raison de la déconnexion.')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('avertir')
                .setDescription("Avertir formellement l'utilisateur pour cette action ? (Défaut: Non)")
                .setRequired(false)),

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

        const targetUser = interaction.options.getUser('utilisateur', true);
        const reason = interaction.options.getString('raison', true);
        const shouldWarn = interaction.options.getBoolean('avertir') ?? false;
        const moderator = interaction.user;

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
             await interaction.editReply({ content: "Cet utilisateur n'est pas sur le serveur." });
             return;
        }
        
        if (!targetMember.voice.channel) {
            await interaction.editReply({ content: "Cet utilisateur n'est dans aucun salon vocal." });
            return;
        }

        const originalVoiceChannel = targetMember.voice.channel;

        try {
            await targetMember.voice.disconnect(`Déconnecté par ${moderator.tag} pour: ${reason}`);

            let replyMessage = `✅ **${targetUser.tag}** a été déconnecté(e) du salon vocal **${originalVoiceChannel.name}**.`;

            if (shouldWarn) {
                recordSanction({
                    guild_id: interaction.guild.id,
                    user_id: targetUser.id,
                    moderator_id: moderator.id,
                    action_type: 'warn',
                    reason: `(Déconnexion Vocale) ${reason}`
                });
                replyMessage += "\nUn avertissement a été enregistré."
            }

            const replyEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setDescription(replyMessage);
            
            await interaction.editReply({ embeds: [replyEmbed] });

            if (config.log_channel_id) {
                const logChannel = interaction.guild.channels.cache.get(config.log_channel_id as string) as TextChannel;
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(0xFFA500)
                        .setTitle('Action de Modération : Déconnexion Vocale')
                        .addFields(
                            { name: 'Utilisateur', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
                            { name: 'Modérateur', value: `${moderator.tag} (${moderator.id})`, inline: false },
                            { name: 'Salon', value: originalVoiceChannel.name, inline: true },
                            { name: 'Raison', value: reason, inline: false },
                            { name: 'Avertissement enregistré', value: shouldWarn ? 'Oui' : 'Non', inline: true }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'ID de l\'utilisateur: ' + targetUser.id });
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }

        } catch (error) {
            console.error('[KickVoc] Error during voice kick:', error);
            await interaction.editReply({ content: `Impossible de déconnecter **${targetUser.tag}**. Vérifiez mes permissions.` });
        }
    },
};

export default KickVocCommand;

    