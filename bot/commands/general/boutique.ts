import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command, ShopItem } from '@/types';
import { getServerConfig } from '@/lib/db';

const BoutiqueCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('boutique')
        .setDescription("Affiche les articles disponibles dans la boutique d'XP."),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande doit être utilisée dans un serveur.', ephemeral: true });
            return;
        }

        const config = await getServerConfig(interaction.guild.id, 'leveling');
        if (!config?.enabled || !config.shop_enabled) {
            await interaction.reply({ content: "La boutique d'XP est désactivée sur ce serveur.", ephemeral: true });
            return;
        }

        const shopItems = config.shop_items || [];

        const embed = new EmbedBuilder()
            .setColor(0xf37349)
            .setTitle(`🛒 Boutique de ${interaction.guild.name}`)
            .setTimestamp();

        if (shopItems.length === 0) {
            embed.setDescription("La boutique est actuellement vide. Revenez plus tard !");
        } else {
            embed.setDescription("Utilisez la commande `/acheter <id_article>` pour effectuer un achat.");
            shopItems.forEach((item: ShopItem) => {
                embed.addFields({
                    name: `${item.name}`,
                    value: `> **ID :** \`${item.id}\`\n> **Prix :** ${item.price.toLocaleString()} XP\n> *${item.description || 'Aucune description'}*`
                });
            });
        }
        
        await interaction.reply({ embeds: [embed] });
    },
};

export default BoutiqueCommand;
