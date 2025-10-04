
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { hasPermission } from '@/lib/db';

const OWNER_ID = '556529963877138442';

const RestartCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('restart')
        .setDescription('Redémarre le bot. (Accès restreint)')
        .setDMPermission(true),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID && !hasPermission(interaction.user.id, 'botrestart')) {
            await interaction.reply({ content: 'Cette commande est exclusivement réservée au propriétaire du bot ou aux utilisateurs autorisés.', flags: MessageFlags.Ephemeral });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('Redémarrage en cours...')
            .setDescription('Le bot va maintenant redémarrer. Le redémarrage complet peut prendre une minute.\n\n**Note :** Le redémarrage automatique dépend du gestionnaire de processus (ex: PM2) configuré pour le bot.');

        await interaction.reply({ embeds: [embed], ephemeral: true });

        console.log(`[System] Redémarrage initié par ${interaction.user.tag}.`);

        // This will stop the bot process. A process manager (like pm2) is needed to restart it.
        process.exit(0);
    },
};

export default RestartCommand;
