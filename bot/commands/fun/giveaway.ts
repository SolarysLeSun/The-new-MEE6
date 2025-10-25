
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageComponentInteraction, GuildMember, PermissionFlagsBits } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, updateUserXP } from '@/lib/db';
import ms from 'ms';

const GiveawayCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription("Lance un giveaway d'XP pour les membres du serveur.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('duree')
                .setDescription('La durée du giveaway (ex: 10m, 1h, 1d).')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('gagnants')
                .setDescription('Le nombre de gagnants.')
                .setRequired(true)
                .setMinValue(1))
        .addIntegerOption(option =>
            option.setName('xp')
                .setDescription("Le montant d'XP à gagner.")
                .setRequired(true)
                .setMinValue(1))
        .addBooleanOption(option =>
            option.setName('boost_bonus')
                .setDescription("Doubler les chances pour les membres qui boostent le serveur ?")
                .setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', ephemeral: true });
            return;
        }

        const funConfig = await getServerConfig(interaction.guild.id, 'fun-commands');
        const levelingConfig = await getServerConfig(interaction.guild.id, 'leveling');

        if (!funConfig?.enabled || !levelingConfig?.enabled) {
            await interaction.reply({ content: "Les modules de fun ou de niveaux sont désactivés. Cette commande n'est pas disponible.", ephemeral: true });
            return;
        }

        const durationStr = interaction.options.getString('duree', true);
        const winnerCount = interaction.options.getInteger('gagnants', true);
        const xpAmount = interaction.options.getInteger('xp', true);
        const boostBonus = interaction.options.getBoolean('boost_bonus') ?? false;

        const durationMs = ms(durationStr);
        if (!durationMs) {
            await interaction.reply({ content: 'Format de durée invalide. Utilisez par exemple: 10m, 1h, 3d.', ephemeral: true });
            return;
        }

        const endTime = new Date(Date.now() + durationMs);

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle(`🎉 Giveaway de ${xpAmount.toLocaleString()} XP ! 🎉`)
            .setDescription(`Réagissez avec 🎉 pour tenter de gagner **${xpAmount.toLocaleString()} XP** !\nIl y aura **${winnerCount}** gagnant(s).\n\nFin du tirage : <t:${Math.floor(endTime.getTime() / 1000)}:R>`)
            .setFooter({ text: `Lancé par ${interaction.user.tag}` })
            .setTimestamp(endTime);
        
        if (boostBonus) {
            embed.addFields({ name: 'Bonus', value: 'Les boosters du serveur ont 2x plus de chances de gagner !' });
        }

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('join_giveaway')
                .setLabel('Participer')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🎉')
        );

        const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const participants = new Set<string>();

        const collector = message.createMessageComponentCollector({ time: durationMs });

        collector.on('collect', async (i: MessageComponentInteraction) => {
            if (!(i.member instanceof GuildMember)) return;
            
            if (participants.has(i.user.id)) {
                await i.reply({ content: 'Vous participez déjà !', ephemeral: true });
                return;
            }

            participants.add(i.user.id);
            await i.reply({ content: 'Votre participation a été enregistrée. Bonne chance !', ephemeral: true });
        });

        collector.on('end', async () => {
            const finalParticipants: string[] = [];
            for (const userId of participants) {
                finalParticipants.push(userId);
                if (boostBonus) {
                    const member = await interaction.guild!.members.fetch(userId).catch(() => null);
                    if (member && member.premiumSinceTimestamp) {
                        finalParticipants.push(userId); // Add a second entry for boosters
                    }
                }
            }

            const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('join_giveaway_ended')
                    .setLabel('Terminé')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎉')
                    .setDisabled(true)
            );
            
            if (finalParticipants.length === 0) {
                const endEmbed = new EmbedBuilder()
                    .setColor(0x808080)
                    .setTitle('Giveaway Terminé')
                    .setDescription('Personne n\'a participé au giveaway. 😢');
                await message.edit({ embeds: [endEmbed], components: [disabledRow] });
                return;
            }

            // Shuffle participants
            for (let i = finalParticipants.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [finalParticipants[i], finalParticipants[j]] = [finalParticipants[j], finalParticipants[i]];
            }

            const uniqueWinners = [...new Set(finalParticipants)];
            const winners = uniqueWinners.slice(0, winnerCount);

            if (winners.length > 0) {
                winners.forEach(winnerId => {
                    updateUserXP(winnerId, interaction.guild!.id, xpAmount, 'add');
                });
                
                const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
                const endEmbed = EmbedBuilder.from(embed)
                    .setColor(0x2ECC71)
                    .setDescription(`Le giveaway est terminé !`)
                    .setFields(
                        { name: 'Gagnant(s)', value: winnerMentions },
                        { name: 'Prix', value: `**${xpAmount.toLocaleString()} XP** chacun` }
                    );

                await message.edit({ embeds: [endEmbed], components: [disabledRow] });
                await message.channel.send(`Félicitations à ${winnerMentions} pour avoir remporté le giveaway !`);

            } else {
                 const endEmbed = EmbedBuilder.from(embed)
                    .setColor(0x808080)
                    .setDescription('Le giveaway est terminé, mais il n\'y a pas eu assez de participants pour désigner un gagnant.');
                await message.edit({ embeds: [endEmbed], components: [disabledRow] });
            }
        });
    },
};

export default GiveawayCommand;
