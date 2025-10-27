import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    ContainerBuilder,
    MessageFlags,
    ButtonBuilder,
    ButtonStyle,
    MessageComponentInteraction,
    GuildMember,
    PermissionFlagsBits,
    ComponentType
} from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, updateUserXP } from '@/lib/db';
import ms from 'ms';

interface GiveawayData {
    messageId: string;
    channelId: string;
    guildId: string;
    hostId: string;
    xpAmount: number;
    winnerCount: number;
    endTime: number;
    boostBonus: boolean;
    participants: Set<string>;
    ended: boolean;
    winners?: string[];
}

const activeGiveaways = new Map<string, GiveawayData>();

const GiveawayCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Gestion des giveaways d\'XP')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Créer un nouveau giveaway')
                .addStringOption(option =>
                    option.setName('duree')
                        .setDescription('Durée (ex: 10m, 1h, 2d, 1w)')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('xp')
                        .setDescription('Montant d\'XP à gagner')
                        .setRequired(true)
                        .setMinValue(100)
                        .setMaxValue(100000))
                .addIntegerOption(option =>
                    option.setName('gagnants')
                        .setDescription('Nombre de gagnants')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(20))
                .addBooleanOption(option =>
                    option.setName('boost_bonus')
                        .setDescription('Doubler les chances des boosters')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Liste des giveaways actifs'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('Terminer un giveaway en cours')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('ID du message du giveaway')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reroll')
                .setDescription('Retirer de nouveaux gagnants')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('ID du message du giveaway')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Informations sur un giveaway')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('ID du message du giveaway')
                        .setRequired(true))),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ 
                content: 'Cette commande ne peut être utilisée que dans un serveur.', 
                ephemeral: true 
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'create':
                await handleCreate(interaction);
                break;
            case 'list':
                await handleList(interaction);
                break;
            case 'end':
                await handleEnd(interaction);
                break;
            case 'reroll':
                await handleReroll(interaction);
                break;
            case 'info':
                await handleInfo(interaction);
                break;
        }
    },
};

async function handleCreate(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const funConfig = await getServerConfig(interaction.guild.id, 'fun-commands');
    const levelingConfig = await getServerConfig(interaction.guild.id, 'leveling');

    if (!funConfig?.enabled || !levelingConfig?.enabled) {
        await interaction.reply({ 
            content: 'Les modules de fun ou de niveaux sont désactivés.', 
            ephemeral: true 
        });
        return;
    }

    const durationStr = interaction.options.getString('duree', true);
    const xpAmount = interaction.options.getInteger('xp', true);
    const winnerCount = interaction.options.getInteger('gagnants', true);
    const boostBonus = interaction.options.getBoolean('boost_bonus') ?? false;

    const durationMs = ms(durationStr);
    if (!durationMs || durationMs < 60000) {
        await interaction.reply({ 
            content: 'Durée invalide ou trop courte (minimum 1 minute). Exemples: 10m, 1h, 2d, 1w', 
            ephemeral: true 
        });
        return;
    }

    const endTime = Date.now() + durationMs;
    const endTimestamp = Math.floor(endTime / 1000);

    try {
        const container = buildGiveawayContainer({
            xpAmount,
            winnerCount,
            endTimestamp,
            boostBonus,
            participantCount: 0,
            hostTag: interaction.user.tag,
            active: true
        });

        const buttons = buildGiveawayButtons(false);

        const message = await interaction.reply({
            components: [container, buttons],
            flags: MessageFlags.IsComponentsV2,
            fetchReply: true
        });

        const giveawayData: GiveawayData = {
            messageId: message.id,
            channelId: interaction.channel!.id,
            guildId: interaction.guild.id,
            hostId: interaction.user.id,
            xpAmount,
            winnerCount,
            endTime,
            boostBonus,
            participants: new Set<string>(),
            ended: false
        };

        activeGiveaways.set(message.id, giveawayData);

        const collector = message.createMessageComponentCollector({ 
            componentType: ComponentType.Button,
            time: durationMs 
        });

        collector.on('collect', async (i: MessageComponentInteraction) => {
            if (!i.isButton()) return;
            
            const giveaway = activeGiveaways.get(message.id);
            if (!giveaway || giveaway.ended) return;

            if (i.customId === 'join_giveaway') {
                await handleJoin(i, giveaway, message);
            } else if (i.customId === 'view_participants') {
                await handleViewParticipants(i, giveaway);
            } else if (i.customId === 'leave_giveaway') {
                await handleLeave(i, giveaway, message);
            }
        });

        collector.on('end', async () => {
            await endGiveaway(message.id);
        });

    } catch (error) {
        console.error('Erreur création giveaway:', error);
        await interaction.reply({
            content: 'Erreur lors de la création du giveaway.',
            ephemeral: true
        });
    }
}

async function handleList(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const guildGiveaways = Array.from(activeGiveaways.values())
        .filter(g => g.guildId === interaction.guild!.id && !g.ended);

    if (guildGiveaways.length === 0) {
        await interaction.reply({
            content: 'Aucun giveaway actif sur ce serveur.',
            ephemeral: true
        });
        return;
    }

    const listContainer = new ContainerBuilder()
        .setAccentColor(0x3498DB)
        .addTextDisplayComponents(
            (text) => text.setContent(
                `**GIVEAWAYS ACTIFS**\n\n` +
                `Il y a **${guildGiveaways.length}** giveaway${guildGiveaways.length > 1 ? 's' : ''} en cours`
            )
        );

    listContainer.addSeparatorComponents((separator) => separator.setDivider(true));

    let listText = '';
    guildGiveaways.forEach((giveaway, index) => {
        const endTimestamp = Math.floor(giveaway.endTime / 1000);
        listText += `**${index + 1}.** ${giveaway.xpAmount.toLocaleString()} XP\n` +
            `${giveaway.participants.size} participants • ${giveaway.winnerCount} gagnants\n` +
            `Fin: <t:${endTimestamp}:R> • <#${giveaway.channelId}>\n` +
            `ID: \`${giveaway.messageId}\`\n\n`;
    });

    listContainer.addTextDisplayComponents((text) => text.setContent(listText));

    await interaction.reply({
        components: [listContainer],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
    });
}

async function handleEnd(interaction: ChatInputCommandInteraction) {
    const messageId = interaction.options.getString('message_id', true);
    const giveaway = activeGiveaways.get(messageId);

    if (!giveaway) {
        await interaction.reply({
            content: 'Giveaway introuvable.',
            ephemeral: true
        });
        return;
    }

    if (giveaway.hostId !== interaction.user.id && 
        !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
            content: 'Seul l\'hôte du giveaway ou un administrateur peut le terminer.',
            ephemeral: true
        });
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        await endGiveaway(messageId);
        
        const endContainer = new ContainerBuilder()
            .setAccentColor(0x2ECC71)
            .addTextDisplayComponents(
                (text) => text.setContent('**GIVEAWAY TERMINÉ**\n\nLes gagnants ont été tirés au sort.')
            );

        await interaction.editReply({
            components: [endContainer],
            flags: MessageFlags.IsComponentsV2
        });
    } catch (error: any) {
        await interaction.editReply({
            content: error.message
        });
    }
}

async function handleReroll(interaction: ChatInputCommandInteraction) {
    const messageId = interaction.options.getString('message_id', true);
    const giveaway = activeGiveaways.get(messageId);

    if (!giveaway || !giveaway.ended) {
        await interaction.reply({
            content: 'Giveaway introuvable ou non terminé.',
            ephemeral: true
        });
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        const channel = await interaction.client.channels.fetch(giveaway.channelId);
        if (!channel?.isTextBased()) throw new Error('Canal introuvable');

        const message = await channel.messages.fetch(messageId);
        
        const winners = await selectWinners(giveaway);
        
        if (winners.length === 0) {
            throw new Error('Pas assez de participants');
        }

        giveaway.winners = winners;

        const container = buildGiveawayContainer({
            xpAmount: giveaway.xpAmount,
            winnerCount: giveaway.winnerCount,
            endTimestamp: Math.floor(giveaway.endTime / 1000),
            boostBonus: giveaway.boostBonus,
            participantCount: giveaway.participants.size,
            hostTag: 'Host',
            active: false,
            winners: winners
        });

        const buttons = buildGiveawayButtons(true);

        await message.edit({
            components: [container, buttons],
            flags: MessageFlags.IsComponentsV2
        });

        const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
        await channel.send(`**REROLL** - Nouveaux gagnants: ${winnerMentions} ont remporté **${giveaway.xpAmount.toLocaleString()} XP** chacun`);

        const rerollContainer = new ContainerBuilder()
            .setAccentColor(0xF39C12)
            .addTextDisplayComponents(
                (text) => text.setContent('**NOUVEAUX GAGNANTS**\n\nDe nouveaux gagnants ont été tirés au sort.')
            );

        await interaction.editReply({
            components: [rerollContainer],
            flags: MessageFlags.IsComponentsV2
        });
    } catch (error: any) {
        await interaction.editReply({
            content: error.message
        });
    }
}

async function handleInfo(interaction: ChatInputCommandInteraction) {
    const messageId = interaction.options.getString('message_id', true);
    const giveaway = activeGiveaways.get(messageId);

    if (!giveaway) {
        await interaction.reply({
            content: 'Giveaway introuvable.',
            ephemeral: true
        });
        return;
    }

    const endTimestamp = Math.floor(giveaway.endTime / 1000);

    const infoContainer = new ContainerBuilder()
        .setAccentColor(giveaway.ended ? 0x95A5A6 : 0x3498DB);

    let infoText = `**INFORMATIONS DU GIVEAWAY**\n\n` +
        `Récompense: **${giveaway.xpAmount.toLocaleString()} XP**\n\n` +
        `Statut: ${giveaway.ended ? 'Terminé' : 'En cours'}\n` +
        `Organisateur: <@${giveaway.hostId}>\n` +
        `Fin: <t:${endTimestamp}:${giveaway.ended ? 'F' : 'R'}>\n\n` +
        `Participants: ${giveaway.participants.size}\n` +
        `Gagnants: ${giveaway.winnerCount}`;

    if (giveaway.boostBonus) {
        infoText += `\nBonus boosters: 2x chances`;
    }

    if (giveaway.ended && giveaway.winners && giveaway.winners.length > 0) {
        const winnerMentions = giveaway.winners.map(id => `<@${id}>`).join(', ');
        infoText += `\n\n**GAGNANTS**\n${winnerMentions}`;
    }

    infoText += `\n\nID: \`${giveaway.messageId}\``;

    infoContainer.addTextDisplayComponents((text) => text.setContent(infoText));

    await interaction.reply({
        components: [infoContainer],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
    });
}

async function handleJoin(
    interaction: MessageComponentInteraction,
    giveaway: GiveawayData,
    message: any
) {
    if (!(interaction.member instanceof GuildMember)) return;

    if (giveaway.participants.has(interaction.user.id)) {
        await interaction.reply({ 
            content: 'Vous participez déjà à ce giveaway.', 
            ephemeral: true 
        });
        return;
    }

    giveaway.participants.add(interaction.user.id);

    await updateGiveawayMessage(message, giveaway);

    const successContainer = new ContainerBuilder()
        .setAccentColor(0x2ECC71)
        .addTextDisplayComponents(
            (text) => text.setContent(
                `**PARTICIPATION ENREGISTRÉE**\n\n` +
                `Bonne chance pour le giveaway.\n\n` +
                `Vous pouvez quitter à tout moment.`
            )
        );

    await interaction.reply({ 
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true 
    });
}

async function handleLeave(
    interaction: MessageComponentInteraction,
    giveaway: GiveawayData,
    message: any
) {
    if (!giveaway.participants.has(interaction.user.id)) {
        await interaction.reply({ 
            content: 'Vous ne participez pas à ce giveaway.', 
            ephemeral: true 
        });
        return;
    }

    giveaway.participants.delete(interaction.user.id);

    await updateGiveawayMessage(message, giveaway);

    await interaction.reply({ 
        content: 'Vous avez quitté le giveaway.', 
        ephemeral: true 
    });
}

async function handleViewParticipants(
    interaction: MessageComponentInteraction,
    giveaway: GiveawayData
) {
    const participants = Array.from(giveaway.participants);
    
    if (participants.length === 0) {
        await interaction.reply({
            content: 'Aucun participant pour le moment.',
            ephemeral: true
        });
        return;
    }

    const participantList = participants
        .slice(0, 20)
        .map((id, index) => `${index + 1}. <@${id}>`)
        .join('\n');

    const viewContainer = new ContainerBuilder()
        .setAccentColor(0x3498DB)
        .addTextDisplayComponents(
            (text) => text.setContent(
                `**LISTE DES PARTICIPANTS**\n\n` +
                participantList +
                `\n\n${participants.length > 20 ? `Et ${participants.length - 20} autres...` : ''}\n` +
                `**Total**: ${participants.length} participant${participants.length > 1 ? 's' : ''}`
            )
        );

    await interaction.reply({ 
        components: [viewContainer],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true 
    });
}

function buildGiveawayContainer(options: {
    xpAmount: number;
    winnerCount: number;
    endTimestamp: number;
    boostBonus: boolean;
    participantCount: number;
    hostTag: string;
    active: boolean;
    winners?: string[];
}) {
    const { xpAmount, winnerCount, endTimestamp, boostBonus, participantCount, active, winners } = options;

    const container = new ContainerBuilder()
        .setAccentColor(active ? 0xFFD700 : winners && winners.length > 0 ? 0x2ECC71 : 0x95A5A6);

    let mainText = `**GIVEAWAY ${active ? '' : 'TERMINÉ'}**\n\n` +
        `Récompense: **${xpAmount.toLocaleString()} XP** par gagnant\n\n`;

    if (active) {
        mainText += `Fin: <t:${endTimestamp}:R>\n`;
    } else {
        mainText += `Terminé: <t:${endTimestamp}:F>\n`;
    }

    mainText += `Gagnants: **${winnerCount}**\n` +
        `Participants: **${participantCount}**`;

    if (boostBonus) {
        mainText += `\nBonus: Boosters ont 2x plus de chances`;
    }

    container.addTextDisplayComponents((text) => text.setContent(mainText));

    if (winners && winners.length > 0) {
        container.addSeparatorComponents((separator) => separator.setDivider(true));
        
        const winnerText = `**GAGNANTS**\n\n` + 
            winners.map((id, i) => `${i + 1}. <@${id}>`).join('\n');
        
        container.addTextDisplayComponents((text) => text.setContent(winnerText));
    }

    if (active) {
        container.addSeparatorComponents((separator) => separator.setDivider(true));
        container.addTextDisplayComponents(
            (text) => text.setContent(`Cliquez sur Participer pour tenter votre chance`)
        );
    }

    return container;
}

function buildGiveawayButtons(ended: boolean) {
    const builder = new ContainerBuilder();

    if (!ended) {
        builder.addButtonComponents(
            (button) => button
                .setCustomId('join_giveaway')
                .setLabel('Participer')
                .setStyle(ButtonStyle.Success),
            (button) => button
                .setCustomId('view_participants')
                .setLabel('Voir participants')
                .setStyle(ButtonStyle.Primary),
            (button) => button
                .setCustomId('leave_giveaway')
                .setLabel('Quitter')
                .setStyle(ButtonStyle.Danger)
        );
    } else {
        builder.addButtonComponents(
            (button) => button
                .setCustomId('giveaway_ended')
                .setLabel('Terminé')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );
    }

    return builder;
}

async function updateGiveawayMessage(message: any, giveaway: GiveawayData) {
    try {
        const container = buildGiveawayContainer({
            xpAmount: giveaway.xpAmount,
            winnerCount: giveaway.winnerCount,
            endTimestamp: Math.floor(giveaway.endTime / 1000),
            boostBonus: giveaway.boostBonus,
            participantCount: giveaway.participants.size,
            hostTag: 'Host',
            active: !giveaway.ended,
            winners: giveaway.winners
        });

        const buttons = buildGiveawayButtons(giveaway.ended);

        await message.edit({
            components: [container, buttons],
            flags: MessageFlags.IsComponentsV2
        });
    } catch (error) {
        console.error('Erreur mise à jour message:', error);
    }
}

async function selectWinners(giveaway: GiveawayData): Promise<string[]> {
    const finalParticipants: string[] = [];
    
    for (const userId of giveaway.participants) {
        finalParticipants.push(userId);
        
        if (giveaway.boostBonus) {
            finalParticipants.push(userId);
        }
    }

    for (let i = finalParticipants.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [finalParticipants[i], finalParticipants[j]] = [finalParticipants[j], finalParticipants[i]];
    }

    const uniqueWinners = [...new Set(finalParticipants)];
    return uniqueWinners.slice(0, giveaway.winnerCount);
}

async function endGiveaway(messageId: string) {
    const giveaway = activeGiveaways.get(messageId);
    if (!giveaway || giveaway.ended) return;

    giveaway.ended = true;

    try {
        const winners = await selectWinners(giveaway);

        if (winners.length === 0) {
            return;
        }

        giveaway.winners = winners;

        winners.forEach(winnerId => {
            updateUserXP(winnerId, giveaway.guildId, giveaway.xpAmount, 'add');
        });

        console.log(`Giveaway terminé: ${winners.length} gagnants`);

    } catch (error) {
        console.error('Erreur fin giveaway:', error);
    }
}

export default GiveawayCommand;
