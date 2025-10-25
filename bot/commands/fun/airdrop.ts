import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

const AirdropCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('airdrop')
        .setDescription("Crée un airdrop d'XP dans le salon.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addIntegerOption(option =>
            option.setName('xp')
                .setDescription("La quantité d'XP à distribuer.")
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande doit être utilisée dans un serveur.', ephemeral: true });
            return;
        }

        const levelingConfig = await getServerConfig(interaction.guild.id, 'leveling');
        if (!levelingConfig?.enabled) {
            await interaction.reply({ content: "Le système de niveaux est désactivé, vous ne pouvez pas créer d'airdrop.", ephemeral: true });
            return;
        }

        const xpAmount = interaction.options.getInteger('xp', true);
        const airdropId = uuidv4();

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle(' largage de ravitaillement !')
            .setDescription(`Un airdrop de **${xpAmount.toLocaleString()} XP** est disponible ! Soyez le premier à le réclamer !`)
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3039/3039415.png')
            .setFooter({ text: `Airdrop créé par ${interaction.user.tag}` });

        const claimButton = new ButtonBuilder()
            .setCustomId(`airdrop_claim_${airdropId}_${xpAmount}`)
            .setLabel("Récupérer l'XP")
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎉');

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(claimButton);

        await interaction.reply({ embeds: [embed], components: [row] });
    },
};

export default AirdropCommand;
