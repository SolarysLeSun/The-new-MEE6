import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, AutocompleteInteraction } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig } from '@/lib/db';

const RoueCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('roue')
        .setDescription('Fait tourner la roue de la fortune.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('lancer')
                .setDescription('Lance une roue de la fortune préconfigurée.')
                .addStringOption(option =>
                    option.setName('nom')
                        .setDescription('Le nom de la roue à lancer.')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('creer')
                .setDescription('Crée et lance une roue temporaire.')
                .addStringOption(option =>
                    option.setName('options')
                        .setDescription('Les options de la roue, séparées par un "|".')
                        .setRequired(true))),

    async autocomplete(interaction: AutocompleteInteraction) {
        if (!interaction.guildId) return;
        const focusedValue = interaction.options.getFocused();
        const config = await getServerConfig(interaction.guildId, 'fortune-wheel');
        const wheels = config?.wheels || [];
        const choices = wheels.map((wheel: { name: string; options: string[] }) => ({ name: wheel.name, value: wheel.name }));
        const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));
        await interaction.respond(filtered.slice(0, 25));
    },

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', ephemeral: true });
            return;
        }

        const config = await getServerConfig(interaction.guild.id, 'fortune-wheel');
        if (!config?.enabled) {
            await interaction.reply({ content: "Le module Roue de la Fortune est désactivé.", ephemeral: true });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        let options: string[] = [];
        let title = "La Roue tourne...";

        if (subcommand === 'lancer') {
            const wheelName = interaction.options.getString('nom', true);
            const wheel = config.wheels?.find((w: any) => w.name === wheelName);
            if (!wheel || wheel.options.length === 0) {
                await interaction.reply({ content: `La roue nommée "${wheelName}" n'a pas été trouvée ou est vide.`, ephemeral: true });
                return;
            }
            options = wheel.options;
            title = `La roue "${wheelName}" tourne...`;
        } else if (subcommand === 'creer') {
            const optionsString = interaction.options.getString('options', true);
            options = optionsString.split('|').map(opt => opt.trim()).filter(Boolean);
            if (options.length < 2) {
                await interaction.reply({ content: 'Veuillez fournir au moins deux options séparées par "|".', ephemeral: true });
                return;
            }
            title = "La roue personnalisée tourne...";
        }

        await interaction.deferReply();
        
        const winningOption = options[Math.floor(Math.random() * options.length)];

        const embed = new EmbedBuilder()
            .setColor(0xFFD700) // Gold
            .setTitle('🎡 Roue de la Fortune 🎡')
            .setDescription(title)
            .setTimestamp();

        const initialMessage = await interaction.editReply({ embeds: [embed] });
        
        // Fake loading effect
        setTimeout(async () => {
            const resultEmbed = new EmbedBuilder()
                .setColor(0x2ECC71) // Green
                .setTitle('🎡 Résultat du Tirage 🎡')
                .setDescription(`Et le résultat est...`)
                .addFields({ name: 'Gagnant', value: `**${winningOption}**` })
                .setFooter({ text: `Lancé par ${interaction.user.tag}`})
                .setTimestamp();

            await initialMessage.edit({ embeds: [resultEmbed] });
        }, 2000);
    },
};

export default RoueCommand;
