
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, TextChannel, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, createGiveaway } from '@/lib/db';
import ms from 'ms';

const GiveawayCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Gère les giveaways sur le serveur.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Lance un nouveau giveaway immédiatement.')
                .addStringOption(option =>
                    option.setName('prix')
                        .setDescription('Le prix à gagner.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('duree')
                        .setDescription("La durée du giveaway (ex: '10m', '1h', '2d').")
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('gagnants')
                        .setDescription('Le nombre de gagnants (défaut: 1).')
                        .setRequired(false)
                        .setMinValue(1))
                .addChannelOption(option =>
                    option.setName('salon')
                        .setDescription("Le salon où lancer le giveaway (défaut: salon actuel).")
                        .setRequired(false))),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', ephemeral: true });
            return;
        }

        const config = await getServerConfig(interaction.guild.id, 'giveaways');
        if (!config?.enabled) {
            await interaction.reply({ content: 'Ce module est désactivé. Veuillez l\'activer dans le panel de configuration.', ephemeral: true });
            return;
        }

        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'start') {
            await handleStart(interaction, config);
        }
    },
};

async function handleStart(interaction: ChatInputCommandInteraction, config: any) {
    const prize = interaction.options.getString('prix', true);
    const durationStr = interaction.options.getString('duree', true);
    const winnerCount = interaction.options.getInteger('gagnants') || 1;
    const channel = (interaction.options.getChannel('salon') || interaction.channel) as TextChannel;

    if (!channel || !channel.isTextBased()) {
        await interaction.reply({ content: "Le salon spécifié n'est pas un salon textuel.", ephemeral: true });
        return;
    }
    
    const durationMs = ms(durationStr);
    if (!durationMs || durationMs <= 0) {
        await interaction.reply({ content: 'Format de durée invalide. Exemples valides : `10m`, `1h`, `2.5d`.', ephemeral: true });
        return;
    }

    const endsAt = new Date(Date.now() + durationMs);

    try {
        const giveawayEmbed = new EmbedBuilder()
            .setTitle(`🎉 **GIVEAWAY** 🎉`)
            .setDescription(`Réagissez avec 🎉 pour participer !\n\n**Prix :** ${prize}`)
            .setColor(0xFFD700) // Gold
            .setTimestamp(endsAt)
            .setFooter({ text: `Se termine le` });

        const message = await channel.send({ embeds: [giveawayEmbed] });
        await message.react('🎉');

        createGiveaway({
            guild_id: interaction.guildId!,
            channel_id: channel.id,
            message_id: message.id,
            prize,
            winner_count: winnerCount,
            ends_at: endsAt.toISOString(),
            created_by: interaction.user.id,
            reward_type: 'custom', // For manual giveaways, reward is custom by default
            reward_value: `Prix à réclamer : ${prize}`,
        });

        await interaction.reply({ content: `Giveaway lancé avec succès dans ${channel} !`, ephemeral: true });

    } catch (error) {
        console.error('[Giveaway Start] Failed to start giveaway:', error);
        await interaction.reply({ content: "Une erreur est survenue lors du lancement du giveaway.", ephemeral: true });
    }
}

export default GiveawayCommand;
