
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, getGlobalAiStatus } from '@/lib/db';
import { truthOrDareFlow } from '@/ai/flows/truthordare-flow';

const TruthOrDareCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('truthordare')
        .setDescription('Joue à Action ou Vérité avec une question générée par IA.')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Choisis ton camp.')
                .setRequired(true)
                .addChoices(
                    { name: 'Truth (Vérité)', value: 'truth' },
                    { name: 'Dare (Action)', value: 'dare' }
                ))
        .addStringOption(option =>
            option.setName('categorie')
                .setDescription("L'intensité de la question.")
                .setRequired(false)
                .addChoices(
                    { name: 'Soft (Léger)', value: 'soft' },
                    { name: 'Fun (Amusant)', value: 'fun' },
                    { name: 'Spicy (Pimenté)', value: 'spicy' }
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

        const globalAiStatus = getGlobalAiStatus();
        if (globalAiStatus.disabled) {
            await interaction.reply({ content: `Les fonctionnalités IA sont désactivées globalement. Raison : ${globalAiStatus.reason}`, ephemeral: true });
            return;
        }

        const type = interaction.options.getString('type', true) as 'truth' | 'dare';
        const category = interaction.options.getString('categorie') as 'soft' | 'fun' | 'spicy' || 'fun';

        await interaction.deferReply();
        
        try {
            const result = await truthOrDareFlow({ type, category });
            
            const embed = new EmbedBuilder()
                .setColor(type === 'truth' ? 0x3498DB : 0xE67E22)
                .setAuthor({ name: `${interaction.user.username} a choisi... ${type === 'truth' ? 'Vérité' : 'Action'} !`})
                .setTitle(result.question);
            
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("[TruthOrDare] Error:", error);
            await interaction.editReply({ content: "Désolé, l'IA n'a pas réussi à générer une question. Réessayez !" });
        }
    },
};

export default TruthOrDareCommand;
