
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import ms from 'ms';

const RappelCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('rappel')
        .setDescription('Définit un rappel personnel.')
        .addStringOption(option =>
            option.setName('delai')
                .setDescription('Le délai avant le rappel (ex: 5m, 1h, 2j).')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Le message que vous souhaitez vous rappeler.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('destination')
                .setDescription('Où envoyer le rappel (par défaut: Messages Privés).')
                .setRequired(false)
                .addChoices(
                    { name: 'Messages Privés', value: 'mp' },
                    { name: 'Salon Actuel', value: 'salon' }
                )),

    async execute(interaction: ChatInputCommandInteraction) {
        const delayStr = interaction.options.getString('delai', true);
        const message = interaction.options.getString('message', true);
        const destination = interaction.options.getString('destination') || 'mp';

        const delayMs = ms(delayStr);

        if (!delayMs || delayMs <= 0) {
            await interaction.reply({ content: 'Format de délai invalide. Utilisez par exemple `10m`, `1h`, `2j`.', ephemeral: true });
            return;
        }

        if (delayMs > ms('30d')) {
            await interaction.reply({ content: 'Le délai de rappel ne peut pas dépasser 30 jours.', ephemeral: true });
            return;
        }

        const reminderTimestamp = Math.floor((Date.now() + delayMs) / 1000);
        const creationTimestamp = Math.floor(Date.now() / 1000);

        await interaction.reply({ content: `<:Oui:1421563353888723084> D'accord ! Je vous le rappellerai <t:${reminderTimestamp}:R>.`, ephemeral: true });

        setTimeout(async () => {
            const cardUrl = new URL(`${process.env.PANEL_BASE_URL}/card/rappel`);
            cardUrl.searchParams.append('authorName', interaction.user.username);
            cardUrl.searchParams.append('authorAvatar', interaction.user.displayAvatarURL({ extension: 'png', size: 128 }));
            cardUrl.searchParams.append('message', message);
            cardUrl.searchParams.append('timestamp', creationTimestamp.toString());
            
            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle('⏰ C\'est l\'heure !')
                .setImage(cardUrl.toString())
                .setDescription(`Rappel demandé <t:${creationTimestamp}:R>`);

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`reschedule_reminder::${delayStr}::${destination}::${Buffer.from(message).toString('base64')}`)
                        .setLabel(`Relancer (${delayStr})`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔄')
                );

            try {
                if (destination === 'mp') {
                    await interaction.user.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });
                } else if (interaction.channel) {
                    await interaction.channel.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });
                }
            } catch (error) {
                console.error('[Rappel] Erreur lors de l\'envoi du rappel :', error);
                // Try to notify user in the original channel if DM fails
                if (destination === 'mp' && interaction.channel) {
                    try {
                        await interaction.followUp({
                            content: `Impossible de vous envoyer votre rappel en message privé. Vos MPs sont probablement fermés.`,
                            ephemeral: true,
                        });
                    } catch(e) {
                         console.error('[Rappel] Impossible de notifier l\'utilisateur de l\'échec du DM.');
                    }
                }
            }
        }, delayMs);
    },
};

export default RappelCommand;
