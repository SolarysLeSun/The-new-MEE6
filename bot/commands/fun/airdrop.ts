
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageComponentInteraction, PermissionFlagsBits, GuildMember } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, updateUserXP } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

const AirdropCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('airdrop')
        .setDescription("Crée un largage d'XP. Le premier à cliquer gagne !")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addIntegerOption(option =>
            option.setName('montant')
                .setDescription("Le montant d'XP à larguer.")
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', ephemeral: true });
            return;
        }

        const funConfig = await getServerConfig(interaction.guild.id, 'fun-commands');
        const levelingConfig = await getServerConfig(interaction.guild.id, 'leveling');

        if (!funConfig?.enabled || !levelingConfig?.enabled) {
            await interaction.reply({ content: "Les modules de fun ou de niveaux sont désactivés. Cette commande n'est pas disponible.", ephemeral: true });
            return;
        }

        const amount = interaction.options.getInteger('montant', true);
        const dropId = uuidv4();

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('🪂 Airdrop en Approche ! 🪂')
            .setDescription(`Un largage de **${amount.toLocaleString()} XP** est disponible ! Soyez le premier à le récupérer !`)
            .setFooter({ text: `Lancé par ${interaction.user.tag}` });
        
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`claim_airdrop_${dropId}`)
                .setLabel("Récupérer l'XP")
                .setStyle(ButtonStyle.Success)
                .setEmoji('🎉')
        );

        const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const collector = message.createMessageComponentCollector({ 
            filter: i => i.customId === `claim_airdrop_${dropId}`,
            max: 1, // The collector stops after one click
            time: 300_000 // 5 minutes
        });

        collector.on('collect', async (i: MessageComponentInteraction) => {
            if (!(i.member instanceof GuildMember)) return;
            
            updateUserXP(i.user.id, i.guild!.id, amount, 'add');

            const successEmbed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setTitle('🎉 Airdrop Récupéré ! 🎉')
                .setDescription(`${i.user.toString()} a récupéré le largage de **${amount.toLocaleString()} XP** !`);

            const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(`claim_airdrop_${dropId}_claimed`)
                    .setLabel('Récupéré')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('✅')
                    .setDisabled(true)
            );
            
            await i.update({ embeds: [successEmbed], components: [disabledRow] });
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                 const timeoutEmbed = new EmbedBuilder()
                    .setColor(0x95a5a6)
                    .setTitle('🪂 Airdrop Expiré 🪂')
                    .setDescription("Personne n'a récupéré le largage à temps.");
                
                 const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`claim_airdrop_${dropId}_expired`)
                        .setLabel('Expiré')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );
                message.edit({ embeds: [timeoutEmbed], components: [disabledRow] }).catch(() => {});
            }
        });
    },
};

export default AirdropCommand;

