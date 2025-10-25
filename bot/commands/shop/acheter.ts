
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, AutocompleteInteraction, GuildMember, TextChannel } from 'discord.js';
import type { Command, XpShopConfig, ShopItem } from '@/types';
import { getServerConfig, getUserLevel, updateUserXP } from '@/lib/db';

const AcheterCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('acheter')
        .setDescription('Achète un article dans la boutique d\'XP.')
        .addStringOption(option =>
            option.setName('article')
                .setDescription('L\'ID de l\'article que vous souhaitez acheter.')
                .setRequired(true)
                .setAutocomplete(true)),

    async autocomplete(interaction: AutocompleteInteraction) {
        if (!interaction.guildId) return;
        const focusedValue = interaction.options.getFocused();
        const config = await getServerConfig(interaction.guildId, 'xp-shop') as XpShopConfig | null;

        if (!config || !config.enabled || !config.items || config.items.length === 0) {
            await interaction.respond([]);
            return;
        }

        const choices = config.items.map(item => ({
            name: `${item.name} (${item.cost} XP)`,
            value: item.id
        }));

        const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));
        await interaction.respond(filtered.slice(0, 25));
    },

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild || !(interaction.member instanceof GuildMember)) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', ephemeral: true });
            return;
        }

        const config = await getServerConfig(interaction.guild.id, 'xp-shop') as XpShopConfig | null;
        if (!config?.enabled) {
            await interaction.reply({ content: "La boutique d'XP est désactivée sur ce serveur.", ephemeral: true });
            return;
        }

        const itemId = interaction.options.getString('article', true);
        const item = config.items.find(i => i.id === itemId);

        if (!item) {
            await interaction.reply({ content: "Cet article n'existe pas.", ephemeral: true });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        const userLevel = getUserLevel(interaction.user.id, interaction.guild.id);
        
        if (userLevel.totalXp < item.cost) {
            await interaction.editReply(`Vous n'avez pas assez d'XP pour acheter cet article. Il vous manque **${(item.cost - userLevel.totalXp).toLocaleString()} XP**.`);
            return;
        }

        try {
            updateUserXP(interaction.user.id, interaction.guild.id, -item.cost);

            if (item.type === 'role') {
                const role = await interaction.guild.roles.fetch(item.value).catch(() => null);
                if (!role) {
                     await interaction.editReply("Erreur : Le rôle associé à cet article n'existe plus. L'XP a été remboursé.");
                     updateUserXP(interaction.user.id, interaction.guild.id, item.cost);
                     return;
                }
                await interaction.member.roles.add(role);
                await interaction.editReply(`Félicitations ! Vous avez acheté et reçu le rôle **${role.name}** pour ${item.cost.toLocaleString()} XP.`);
            
            } else if (item.type === 'custom') {
                await interaction.editReply(`Félicitations ! Vous avez acheté l'article **${item.name}** pour ${item.cost.toLocaleString()} XP.`);
                
                if (config.log_channel_id) {
                    const logChannel = await interaction.guild.channels.fetch(config.log_channel_id).catch(() => null) as TextChannel;
                    if (logChannel) {
                        const embed = new EmbedBuilder()
                            .setTitle("Nouvel Achat Personnalisé")
                            .setDescription(`${interaction.user.toString()} a acheté l'article **${item.name}**.`)
                            .addFields(
                                { name: 'ID de l\'article', value: item.id },
                                { name: 'Valeur personnalisée', value: item.value }
                            )
                            .setColor(0x00FF00)
                            .setTimestamp();
                        let content = '';
                        if (config.mention_role_id && config.mention_role_id !== 'none') {
                            content = `<@&${config.mention_role_id}>`;
                        }
                        await logChannel.send({ content, embeds: [embed] });
                    }
                }
            }

        } catch (error) {
            console.error('[AcheterCommand] Error:', error);
            await interaction.editReply("Une erreur est survenue lors de l'achat. Votre XP n'a pas été déduit.");
        }
    },
};

export default AcheterCommand;
