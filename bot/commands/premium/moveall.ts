
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, ChannelType, VoiceChannel, Collection, GuildMember } from 'discord.js';
import type { Command } from '../../../src/types';
import { getServerConfig, checkTesterStatus } from '../../../src/lib/db';

const MoveAllCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('moveall')
        .setDescription('Déplace en masse des utilisateurs en vocal. (Premium / Testeur)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('from_channel')
                .setDescription('Déplace tous les utilisateurs d\'un salon vocal spécifique.')
                .addChannelOption(option =>
                    option.setName('source')
                        .setDescription('Le salon vocal source.')
                        .addChannelTypes(ChannelType.GuildVoice)
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('destination')
                        .setDescription('Le salon vocal de destination.')
                        .addChannelTypes(ChannelType.GuildVoice)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('from_server')
                .setDescription('Déplace tous les utilisateurs de tous les salons vocaux.')
                .addChannelOption(option =>
                    option.setName('destination')
                        .setDescription('Le salon vocal de destination.')
                        .addChannelTypes(ChannelType.GuildVoice)
                        .setRequired(true))),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', flags: MessageFlags.Ephemeral });
            return;
        }

        const moveallConfig = await getServerConfig(interaction.guild.id, 'moveall');
        const testerStatus = checkTesterStatus(interaction.user.id, interaction.guild.id);

        if (!moveallConfig?.premium && !testerStatus.isTester) {
            await interaction.reply({ content: "Cette commande est réservée aux serveurs Premium ou aux utilisateurs Testeurs.", flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        const destinationChannel = interaction.options.getChannel('destination') as VoiceChannel;

        if (!destinationChannel || destinationChannel.type !== ChannelType.GuildVoice) {
            await interaction.editReply({ content: 'Le salon de destination doit être un salon vocal valide.' });
            return;
        }

        // Check bot's permissions for the destination channel
        if (!destinationChannel.permissionsFor(interaction.client.user)?.has(PermissionFlagsBits.MoveMembers) || !destinationChannel.permissionsFor(interaction.client.user)?.has(PermissionFlagsBits.Connect)) {
            await interaction.editReply({ content: `Je n'ai pas les permissions suffisantes (Connecter, Déplacer les membres) pour le salon de destination **${destinationChannel.name}**.` });
            return;
        }

        let membersToMove: Collection<string, GuildMember> = new Collection();
        let sourceDescription = '';

        if (subcommand === 'from_channel') {
            const sourceChannel = interaction.options.getChannel('source') as VoiceChannel;
            if (!sourceChannel || sourceChannel.type !== ChannelType.GuildVoice) {
                await interaction.editReply({ content: 'Le salon source doit être un salon vocal valide.' });
                return;
            }
            if (sourceChannel.id === destinationChannel.id) {
                await interaction.editReply({ content: 'Le salon source et de destination ne peuvent pas être les mêmes.' });
                return;
            }
            membersToMove = sourceChannel.members.filter(m => !m.user.bot);
            sourceDescription = `du salon **${sourceChannel.name}**`;

        } else if (subcommand === 'from_server') {
            const allVoiceChannels = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice && c.id !== destinationChannel.id) as Collection<string, VoiceChannel>;
            allVoiceChannels.forEach(channel => {
                channel.members.filter(m => !m.user.bot).forEach(member => {
                    membersToMove.set(member.id, member);
                });
            });
            sourceDescription = `de tout le serveur`;
        }

        if (membersToMove.size === 0) {
            await interaction.editReply({ content: 'Aucun utilisateur à déplacer.' });
            return;
        }

        let movedCount = 0;
        let errorCount = 0;

        await interaction.editReply({ content: `Déplacement de ${membersToMove.size} utilisateur(s) en cours...` });

        const movePromises = membersToMove.map(async (member) => {
            try {
                // Double check permissions right before moving
                if (member.voice.channel && member.voice.channel.permissionsFor(interaction.client.user)?.has(PermissionFlagsBits.MoveMembers)) {
                    await member.voice.setChannel(destinationChannel, `Déplacé en masse par ${interaction.user.tag}`);
                    movedCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                console.error(`[MoveAll] Impossible de déplacer ${member.user.tag}:`, error);
                errorCount++;
            }
        });

        await Promise.all(movePromises);

        const embed = new EmbedBuilder()
            .setColor(movedCount > 0 ? 0x00FF00 : 0xFF0000)
            .setTitle('Rapport de Déplacement de Masse')
            .setDescription(`Opération terminée ${sourceDescription} vers **${destinationChannel.name}**.`)
            .addFields(
                { name: 'Succès', value: `${movedCount} utilisateur(s) déplacé(s)`, inline: true },
                { name: 'Échecs', value: `${errorCount} utilisateur(s) non déplacé(s)`, inline: true }
            )
            .setFooter({ text: `Opération effectuée par ${interaction.user.tag}` });
            
        await interaction.editReply({ content: '', embeds: [embed] });
    },
};

export default MoveAllCommand;
