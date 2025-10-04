
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '../../../src/types';
import { createPremiumKey, hasPermission } from '../../../src/lib/db';
import ms from 'ms';

const OWNER_ID = '556529963877138442';

const GenPremiumCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('genpremium')
        .setDescription('Génère de nouvelles clés d\'activation premium. (Accès restreint)')
        .setDMPermission(true) // Can be used in DMs
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Durée de validité des clés (ex: 30d, 1y). Vide pour une clé à vie.')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Nombre de clés à générer. Défaut: 3')
                .setMinValue(1)
                .setMaxValue(25)
                .setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        // Check if the user is the owner OR has the delegated permission
        if (interaction.user.id !== OWNER_ID && !hasPermission(interaction.user.id, 'genpremium')) {
            await interaction.reply({ content: 'Cette commande est réservée au propriétaire du bot ou aux utilisateurs autorisés.', flags: MessageFlags.Ephemeral });
            return;
        }

        const durationString = interaction.options.getString('duration');
        const amount = interaction.options.getInteger('amount') || 3;
        
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
            const newKeys = [];
            for (let i = 0; i < amount; i++) {
                newKeys.push(createPremiumKey(interaction.user.id, expiresAt));
            }

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle(`🔑 ${amount} Clé(s) Premium Générée(s)`)
                .setDescription(`\`\`\`${newKeys.join('\n')}\`\`\``)
                .addFields(
                    { name: 'Validité', value: durationString ? `Expire dans ${durationString}` : 'À vie' }
                )
                .setFooter({ text: 'Donnez ces clés à un administrateur de serveur pour qu\'il les active.' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

        } catch (error) {
            console.error('[GenPremium] Error creating premium key:', error);
            await interaction.reply({ content: 'Une erreur est survenue lors de la création des clés.', flags: MessageFlags.Ephemeral });
        }
    },
};

export default GenPremiumCommand;
