
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

        const reminderTime = Math.floor((Date.now() + delayMs) / 1000);

        await interaction.reply({ content: `<:Oui:1421563353888723084> D'accord ! Je vous rappellerai votre message <t:${reminderTime}:R>.`, ephemeral: true });

        setTimeout(async () => {
            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle('⏰ C\'est l\'heure !')
                .setDescription(`Il y a **${delayStr}** (<t:${Math.floor(Date.now()/1000 - delayMs/1000)}:R>), vous m'avez demandé de vous rappeler ceci :`)
                .addFields({ name: 'Votre message', value: message })
                .setTimestamp(reminderTime * 1000);

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`reschedule_reminder::${delayStr}::${destination}::${Buffer.from(message).toString('base64')}`)
                        .setLabel('Relancer le rappel')
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
                if (destination === 'mp' && interaction.channel) {
                    try {
                        await interaction.channel.send({
                            content: `${interaction.user}, impossible de vous envoyer votre rappel en MP. Vos messages privés sont probablement fermés.`,
                        });
                    } catch (channelError) {
                         console.error('[Rappel] Erreur lors de l'envoi du message de secours dans le salon :', channelError);
                    }
                }
            }
        }, delayMs);
    },
};

export default RappelCommand;
