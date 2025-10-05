
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, AutocompleteInteraction, ApplicationCommandOptionChoiceData } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, getWheelsForGuild } from '@/lib/db';

const RoolCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('roue')
        .setDescription('Fait tourner une roue de la fortune.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('lancer')
                .setDescription('Lance une roue pré-configurée.')
                .addStringOption(option =>
                    option.setName('nom')
                        .setDescription('Le nom de la roue à lancer.')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('temporaire')
                .setDescription('Crée et lance une roue avec les options fournies.')
                .addStringOption(option =>
                    option.setName('options')
                        .setDescription('Les options séparées par un "|". Ex: "Choix 1 | Choix 2"')
                        .setRequired(true))),

    async autocomplete(interaction: AutocompleteInteraction) {
        if (!interaction.guildId) return;

        const focusedValue = interaction.options.getFocused();
        const wheels = getWheelsForGuild(interaction.guildId);
        
        const filtered = wheels
            .filter(wheel => wheel.name.toLowerCase().startsWith(focusedValue.toLowerCase()))
            .map(wheel => ({ name: wheel.name, value: wheel.name }));

        await interaction.respond(filtered.slice(0, 25) as ApplicationCommandOptionChoiceData[]);
    },

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

        const subcommand = interaction.options.getSubcommand();
        let options: string[] = [];
        let wheelName = 'Roue Temporaire';

        if (subcommand === 'lancer') {
            const name = interaction.options.getString('nom', true);
            const wheels = getWheelsForGuild(interaction.guild.id);
            const selectedWheel = wheels.find(w => w.name === name);

            if (!selectedWheel) {
                await interaction.reply({ content: `Impossible de trouver une roue nommée "${name}".`, ephemeral: true });
                return;
            }
            wheelName = selectedWheel.name;
            options = selectedWheel.options;
            
        } else if (subcommand === 'temporaire') {
            const optionsString = interaction.options.getString('options', true);
            options = optionsString.split('|').map(opt => opt.trim()).filter(Boolean);
        }

        if (options.length < 2) {
            await interaction.reply({ content: 'La roue doit avoir au moins 2 options.', ephemeral: true });
            return;
        }
        
        await interaction.deferReply();
        
        const winner = options[Math.floor(Math.random() * options.length)];
        
        // Initial embed
        const initialEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`🎡 Lancement de la roue : "${wheelName}"`)
            .setDescription("La roue tourne... tourne... et s'arrête sur...")
            .setThumbnail('https://cdn.discordapp.com/attachments/1118649503445893190/1247653457916596325/wheel.gif?ex=6660c915&is=665f7795&hm=55734a742de878349afe6378a5840d0e6593a20a4b0d01d4a04875322c3666d3&');
        
        await interaction.editReply({ embeds: [initialEmbed] });

        // Wait a bit for dramatic effect
        await new Promise(resolve => setTimeout(resolve, 3000));

        const finalEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`🎉 Résultat de la roue : "${wheelName}"`)
            .setDescription(`Et le gagnant est... **${winner}** ! Félicitations !`)
            .setAuthor({ name: `Lancé par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.editReply({ embeds: [finalEmbed] });
    },
};

export default RoolCommand;
