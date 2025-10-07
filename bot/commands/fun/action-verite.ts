
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageComponentInteraction } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig } from '@/lib/db';
import { truthOrDareFlow } from '@/ai/flows/truth-or-dare-flow';
import { v4 as uuidv4 } from 'uuid';

const TruthOrDareCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('action-verite')
        .setDescription('Joue à Action ou Vérité avec l\'IA.')
        .addStringOption(option =>
            option.setName('theme')
                .setDescription("Le thème pour les questions et les défis.")
                .setRequired(false)
                .addChoices(
                    { name: 'Classique', value: 'classic' },
                    { name: 'Piquant / Amour', value: 'spicy' },
                    { name: 'Bizarre / WTF', value: 'weird' },
                    { name: '🔥 +18 (Contenu adulte)', value: 'adult' }
                )),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', ephemeral: true });
            return;
        }

        const config = await getServerConfig(interaction.guild.id, 'fun-commands');
        if (!config?.enabled) {
            await interaction.reply({ content: "Le module de commandes fun est désactivé.", ephemeral: true });
            return;
        }
        
        const theme = interaction.options.getString('theme') || 'classic';
        const gameId = uuidv4();

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('Action ou Vérité !')
            .setDescription(`${interaction.user.toString()} a lancé une partie avec le thème **${theme}** ! Qui veut jouer ?`);
        
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`truth_${gameId}_${theme}`).setLabel('Vérité').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`dare_${gameId}_${theme}`).setLabel('Action').setStyle(ButtonStyle.Danger)
        );

        const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const collector = message.createMessageComponentCollector({ time: 3_600_000 }); // 1 hour

        collector.on('collect', async (i: MessageComponentInteraction) => {
            if (!i.isButton()) return;
            
            await i.deferReply();

            const [type, collectedGameId, collectedTheme] = i.customId.split('_');

            if (collectedGameId !== gameId) return;

            try {
                const result = await truthOrDareFlow({
                    type: type as 'truth' | 'dare',
                    theme: collectedTheme,
                });
                
                let title: string;
                let color: number;

                if (type === 'truth') {
                    title = '❓ Vérité';
                    color = 0x2ECC71;
                } else {
                    title = '🔥 Action';
                    color = 0xE74C3C;
                }

                const gameEmbed = new EmbedBuilder()
                    .setColor(color)
                    .setTitle(title)
                    .setDescription(`${i.user.toString()}, voici ton choix :\n\n**${result.content}**`);
                
                await i.editReply({ embeds: [gameEmbed] });

            } catch (error) {
                console.error('[Action-Verite] Error calling AI flow:', error);
                await i.editReply({ content: "Désolé, l'IA est en panne d'inspiration. Réessayez !" });
            }
        });

        collector.on('end', () => {
            message.edit({ components: [] }).catch(() => {});
        });
    },
};

export default TruthOrDareCommand;
