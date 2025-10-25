
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command, XpShopConfig } from '@/types';
import { getServerConfig } from '@/lib/db';

const BoutiqueCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('boutique')
        .setDescription('Affiche les articles disponibles dans la boutique d\'XP.'),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', ephemeral: true });
            return;
        }

        const config = await getServerConfig(interaction.guild.id, 'xp-shop') as XpShopConfig | null;
        if (!config?.enabled) {
            await interaction.reply({ content: "La boutique d'XP est désactivée sur ce serveur.", ephemeral: true });
            return;
        }

        if (!config.items || config.items.length === 0) {
            await interaction.reply({ content: "La boutique est vide pour le moment.", ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`🛒 Boutique de ${interaction.guild.name}`)
            .setDescription("Utilisez la commande `/acheter <id_article>` pour acheter un article.")
            .setTimestamp();

        for (const item of config.items) {
            embed.addFields({
                name: `${item.name} - ${item.cost.toLocaleString()} XP`,
                value: `> ${item.description}\n> \`ID: ${item.id}\``,
                inline: false,
            });
        }

        await interaction.reply({ embeds: [embed] });
    },
};

export default BoutiqueCommand;
