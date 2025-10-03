
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, ChannelType, VoiceChannel, Collection, GuildMember } from 'discord.js';
import type { Command } from '../../../src/types';
import { getServerConfig, checkTesterStatus } from '../../../src/lib/db';

const DecoAllCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('decoall')
        .setDescription('Déconnecte en masse des utilisateurs en vocal. (Premium / Testeur)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('from_channel')
                .setDescription('Déconnecte tous les utilisateurs d\'un salon vocal spécifique.')
                .addChannelOption(option =>
                    option.setName('source')
                        .setDescription('Le salon vocal source.')
                        .addChannelTypes(ChannelType.GuildVoice)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('from_server')
                .setDescription('Déconnecte tous les utilisateurs de tous les salons vocaux.')),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', flags: MessageFlags.Ephemeral });
            return;
        }

        const moveallConfig = await getServerConfig(interaction.guild.id, 'moveall'); // Shared config with moveall
        const testerStatus = checkTesterStatus(interaction.user.id, interaction.guild.id);

        if (!moveallConfig?.premium && !testerStatus.isTester) {
            await interaction.reply({ content: "Cette commande est réservée aux serveurs Premium ou aux utilisateurs Testeurs.", flags: MessageFlags.Ephemeral });
            return;
        }

        // Check for bot's MoveMembers permission at a higher level
        const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
        if (!botMember.permissions.has(PermissionFlagsBits.MoveMembers)) {
             await interaction.reply({ content: "Je n'ai pas la permission globale de `Déplacer les membres` pour exécuter cette commande.", flags: MessageFlags.Ephemeral });
             return;
        }

        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        
        let membersToDisconnect: Collection<string, GuildMember> = new Collection();
        let sourceDescription = '';

        if (subcommand === 'from_channel') {
            const sourceChannel = interaction.options.getChannel('source') as VoiceChannel;
            if (!sourceChannel || sourceChannel.type !== ChannelType.GuildVoice) {
                await interaction.editReply({ content: 'Le salon source doit être un salon vocal valide.' });
                return;
            }
            membersToDisconnect = sourceChannel.members.filter(m => !m.user.bot);
            sourceDescription = `du salon **${sourceChannel.name}**`;

        } else if (subcommand === 'from_server') {
            const allVoiceChannels = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice) as Collection<string, VoiceChannel>;
            allVoiceChannels.forEach(channel => {
                channel.members.filter(m => !m.user.bot).forEach(member => {
                    membersToDisconnect.set(member.id, member);
                });
            });
            sourceDescription = `de tout le serveur`;
        }

        if (membersToDisconnect.size === 0) {
            await interaction.editReply({ content: 'Aucun utilisateur à déconnecter.' });
            return;
        }

        let disconnectedCount = 0;
        let errorCount = 0;

        await interaction.editReply({ content: `Déconnexion de ${membersToDisconnect.size} utilisateur(s) en cours...` });

        const disconnectPromises = membersToDisconnect.map(async (member) => {
            try {
                await member.voice.disconnect(`Déconnecté en masse par ${interaction.user.tag}`);
                disconnectedCount++;
            } catch (error) {
                console.error(`[DecoAll] Impossible de déconnecter ${member.user.tag}:`, error);
                errorCount++;
            }
        });

        await Promise.all(disconnectPromises);

        const embed = new EmbedBuilder()
            .setColor(disconnectedCount > 0 ? 0x00FF00 : 0xFF0000)
            .setTitle('Rapport de Déconnexion de Masse')
            .setDescription(`Opération terminée pour les utilisateurs ${sourceDescription}.`)
            .addFields(
                { name: 'Succès', value: `${disconnectedCount} utilisateur(s) déconnecté(s)`, inline: true },
                { name: 'Échecs', value: `${errorCount} utilisateur(s) non déconnecté(s)`, inline: true }
            )
            .setFooter({ text: `Opération effectuée par ${interaction.user.tag}` });
            
        await interaction.editReply({ content: '', embeds: [embed] });
    },
};

export default DecoAllCommand;
