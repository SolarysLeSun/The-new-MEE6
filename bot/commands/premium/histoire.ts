
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '../../../src/types';
import { getServerConfig, getGlobalAiStatus } from '../../../src/lib/db';
import { storyFlow } from '../../../src/ai/flows/story-flow';

const HistoireCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('histoire')
        .setDescription('Fait écrire une petite histoire à l\'IA. (Premium)')
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .addStringOption(option =>
            option.setName('sujet')
                .setDescription('Le thème principal ou le début de l\'histoire.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('tags')
                .setDescription('Tags pour l\'ambiance (ex: sombre, humoristique, épique), séparés par des virgules.')
                .setRequired(false))
        .addUserOption(option => option.setName('personnage1').setDescription('Un personnage à inclure dans l\'histoire.'))
        .addUserOption(option => option.setName('personnage2').setDescription('Un deuxième personnage à inclure.'))
        .addUserOption(option => option.setName('personnage3').setDescription('Un troisième personnage à inclure.')),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', flags: MessageFlags.Ephemeral });
            return;
        }

        const globalAiStatus = getGlobalAiStatus();
        if (globalAiStatus.disabled) {
            await interaction.reply({ content: `Les fonctionnalités IA sont désactivées globalement. Raison : ${globalAiStatus.reason}`, ephemeral: true });
            return;
        }

        const config = await getServerConfig(interaction.guild.id, 'content-ai');
        if (!config?.enabled || !config.premium) {
            await interaction.reply({ content: "Cette fonctionnalité est réservée aux serveurs Premium et le module Créateur de Contenu IA doit être activé.", flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply();

        const topic = interaction.options.getString('sujet', true);
        const tags = interaction.options.getString('tags') || undefined;
        
        const users = [
            interaction.options.getUser('personnage1'),
            interaction.options.getUser('personnage2'),
            interaction.options.getUser('personnage3'),
        ].filter(Boolean).map(u => u!.username);

        try {
            const result = await storyFlow({
                topic,
                tags,
                users,
                authorName: interaction.user.username,
            });

            const embed = new EmbedBuilder()
                .setColor(0x9932CC) // DarkOrchid
                .setTitle(result.title)
                .setDescription(result.story)
                .setFooter({ text: `Une histoire demandée par ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('[HistoireCommand] Error executing storyFlow:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de la création de l\'histoire. L\'IA a peut-être manqué d\'inspiration.' });
        }
    },
};

export default HistoireCommand;
