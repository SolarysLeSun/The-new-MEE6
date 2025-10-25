import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, TextChannel, User, GuildMember } from 'discord.js';
import type { Command, ShopItem } from '@/types';
import { getServerConfig, getUserLevel, updateUserXP } from '@/lib/db';

const AcheterCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('acheter')
        .setDescription('Achète un article dans la boutique d\'XP.')
        .addStringOption(option =>
            option.setName('item_id')
                .setDescription("L'ID unique de l'article à acheter.")
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('quantite')
                .setDescription("La quantité d'articles à acheter (défaut: 1).")
                .setMinValue(1)
                .setRequired(false)),

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

        await interaction.deferReply({ ephemeral: true });

        const itemId = interaction.options.getString('item_id', true);
        const quantity = interaction.options.getInteger('quantite') || 1;
        const shopItems = config.shop_items || [];
        const itemToBuy = shopItems.find((item: ShopItem) => item.id.toLowerCase() === itemId.toLowerCase());

        if (!itemToBuy) {
            await interaction.editReply({ content: `L'article avec l'ID \`${itemId}\` n'a pas été trouvé. Utilisez \`/boutique\` pour voir les articles disponibles.` });
            return;
        }

        const totalPrice = itemToBuy.price * quantity;
        const userLevel = getUserLevel(interaction.user.id, interaction.guild.id);

        if (userLevel.totalXp < totalPrice) {
            await interaction.editReply({ content: `Vous n'avez pas assez d'XP ! Il vous faut **${totalPrice.toLocaleString()} XP** mais vous n'avez que **${userLevel.totalXp.toLocaleString()} XP**.` });
            return;
        }

        try {
            // Deduct XP
            updateUserXP(interaction.user.id, interaction.guild.id, -totalPrice, 'add');

            let rewardMessage = `Vous avez acheté **${quantity}x ${itemToBuy.name}** pour **${totalPrice.toLocaleString()} XP** !`;
            const member = interaction.member as GuildMember;

            if (itemToBuy.type === 'role') {
                const role = await interaction.guild.roles.fetch(itemToBuy.reward_id).catch(() => null);
                if (role) {
                    await member.roles.add(role);
                    rewardMessage += `\nLe rôle **${role.name}** vous a été attribué.`;
                } else {
                    rewardMessage += `\n⚠️ Le rôle récompense est introuvable. Veuillez contacter un administrateur.`;
                }
            }
            
            // Send notification to purchase channel
            if (config.shop_notification_channel_id) {
                const notifChannel = await interaction.guild.channels.fetch(config.shop_notification_channel_id).catch(() => null) as TextChannel;
                if (notifChannel) {
                    let pingMessage = '';
                    if(config.shop_notification_role_id) {
                        pingMessage = `<@&${config.shop_notification_role_id}>`;
                    }
                    const notifEmbed = new EmbedBuilder()
                        .setColor(0x57F287)
                        .setTitle('Nouvel Achat dans la Boutique')
                        .setDescription(`**${interaction.user.tag}** a acheté un article !`)
                        .addFields(
                            { name: 'Article', value: `${quantity}x ${itemToBuy.name} (\`${itemToBuy.id}\`)`, inline: true },
                            { name: 'Type de Récompense', value: itemToBuy.type === 'role' ? 'Rôle Automatique' : 'Objet Personnalisé', inline: true }
                        )
                        .setTimestamp();
                    await notifChannel.send({ content: pingMessage, embeds: [notifEmbed] });
                }
            }

            await interaction.editReply({ content: rewardMessage });

        } catch (error) {
            console.error('[AcheterCommand] Error:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de votre achat.' });
        }
    },
};

export default AcheterCommand;
