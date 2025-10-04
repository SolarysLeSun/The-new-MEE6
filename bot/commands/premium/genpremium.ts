
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '../../../src/types';
import { createPremiumKey } from '../../../src/lib/db';
import ms from 'ms';

const OWNER_ID = '556529963877138442';

const GenPremiumCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('genpremium')
        .setDescription('Génère une nouvelle clé d\'activation premium. (Propriétaire seulement)')
        .setDMPermission(true) // Can be used in DMs
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Durée de validité de la clé (ex: 30d, 1y). Vide pour une clé à vie.')
                .setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID) {
            await interaction.reply({ content: 'Cette commande est réservée au propriétaire du bot.', flags: MessageFlags.Ephemeral });
            return;
        }

        const durationString = interaction.options.getString('duration');
        let expiresAt: Date | null = null;
        let durationMs: number | null = null;
        if (durationString) {
            durationMs = ms(durationString);
            if (!durationMs) {
                await interaction.reply({ content: 'Format de durée invalide. Utilisez par exemple `30d`, `2m`, `1y`.', flags: MessageFlags.Ephemeral });
                return;
            }
            expiresAt = new Date(Date.now() + durationMs);
        }

        try {
            const newKey = createPremiumKey(interaction.user.id, expiresAt);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🔑 Clé Premium Générée')
                .setDescription(`Une nouvelle clé a été générée avec succès.`)
                .addFields(
                    { name: 'Clé d\'activation', value: `\`${newKey}\`` },
                    { name: 'Validité', value: durationString ? `Expire dans ${durationString}` : 'À vie' }
                )
                .setFooter({ text: 'Donnez cette clé à un administrateur de serveur pour qu\'il l\'active via la commande /set premium-key ou le panel.' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

        } catch (error) {
            console.error('[GenPremium] Error creating premium key:', error);
            await interaction.reply({ content: 'Une erreur est survenue lors de la création de la clé.', flags: MessageFlags.Ephemeral });
        }
    },
};

export default GenPremiumCommand;

    