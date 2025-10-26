
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '@/types';
import { execSync } from 'child_process';

let gitBranch: string;
try {
    // Utilise git pour obtenir le nom de la branche actuelle
    gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
} catch (e) {
    console.error("Impossible de récupérer la branche Git, la version sera 'inconnue'.");
    gitBranch = 'inconnue';
}


const VersionCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('version')
        .setDescription('Affiche la version actuelle du bot.'),

    async execute(interaction: ChatInputCommandInteraction) {

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🔧 MarcusBot développé par ForgeNet')
            .addFields(
                { name: '📦 Version du bot', value: `v${gitBranch}`, inline: true },
                { name: 'Dernière mise à jour', value: `Consultez [status.marcusbot.fr](https://status.marcusbot.fr)`, inline: true }
            );

        await interaction.reply({
            content: '✨ Créé avec ❤️ par Forge Network → forgenet.fr',
            embeds: [embed]
        });
    },
};

export default VersionCommand;
