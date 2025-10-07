

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig } from '@/lib/db';
import { navCategories } from '@/components/module-sidebar'; // We can reuse this!
import { faqNavigationFlow } from '@/ai/flows/faq-navigation-flow';

const MarcusFaqCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('marcusfaq')
        .setDescription("Demandez à l'IA où trouver une fonctionnalité.")
        .addStringOption(option => 
            option.setName('question')
                .setDescription('Votre question (ex: "comment changer le message de bienvenue ?", "où activer l\'anti-raid ?")')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) {
            await interaction.reply({ content: 'Cette commande doit être utilisée sur un serveur.', ephemeral: true });
            return;
        }

        const config = await getServerConfig(interaction.guildId, 'general-commands');
        if (!config?.command_enabled?.marcusfaq) {
            await interaction.reply({ content: "Cette commande est désactivée sur ce serveur.", ephemeral: true });
            return;
        }

        const question = interaction.options.getString('question', true);
        await interaction.deferReply({ ephemeral: true });

        // Flatten the modules from the sidebar config to pass to the AI
        const allModules = navCategories.flatMap(category => category.items);

        try {
            const result = await faqNavigationFlow({
                userQuestion: question,
                modules: allModules,
            });
            
            const embed = new EmbedBuilder()
                .setAuthor({ name: `Question de ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() || undefined })
                .setTitle(`Recherche : "${question}"`)
                .setColor(result.found ? 0x00FF00 : 0xFFCC00);
            
            const components: ActionRowBuilder<ButtonBuilder>[] = [];

            if (result.found) {
                embed.setDescription(`💡 ${result.explanation}`);

                const panelUrl = process.env.PANEL_BASE_URL || 'http://localhost:9002';
                const moduleUrl = `${panelUrl}/dashboard/${interaction.guildId}/${result.moduleHref}`;
                
                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setLabel(`Aller au module "${result.moduleName}"`)
                        .setStyle(ButtonStyle.Link)
                        .setURL(moduleUrl)
                );
                components.push(row);

            } else {
                embed.setDescription("🤔 Je n'ai pas trouvé de module correspondant à votre demande. Essayez de reformuler votre question ou parcourez les modules via la commande `/marcus`.");
            }

            await interaction.editReply({ embeds: [embed], components });

        } catch (error) {
            console.error('[MarcusFaq] Error executing faqNavigationFlow:', error);
            await interaction.editReply({ content: "Désolé, une erreur est survenue pendant que je réfléchissais. Veuillez réessayer." });
        }
    },
};

export default MarcusFaqCommand;
