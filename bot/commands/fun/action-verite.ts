
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageComponentInteraction } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig } from '@/lib/db';

const truths = [
    "Quelle est la chose la plus embarrassante que tu aies faite ?",
    "Quel est ton plus grand secret ?",
    "Si tu pouvais être quelqu'un d'autre pour une journée, qui serais-tu et pourquoi ?",
    "Quelle est la chose la plus folle que tu aies faite par amour ?",
    "As-tu déjà triché à un examen ?",
    "Quel est le mensonge le plus important que tu aies jamais dit ?",
    "De quoi as-tu le plus peur ?",
    "Quelle est la chose que tu regrettes le plus ?",
    "Qui est ton crush secret sur ce serveur ?",
    "Quelle est la rumeur la plus folle que tu aies entendue sur toi ?"
];

const dares = [
    "Envoie un message privé embarrassant à la dernière personne à qui tu as parlé.",
    "Change ta photo de profil pour une image ridicule pendant 10 minutes.",
    "Poste un selfie peu flatteur dans le salon #général.",
    "Parle en utilisant uniquement des emojis pendant les 5 prochaines minutes.",
    "Fais une imitation d'un autre membre du serveur en vocal.",
    "Raconte une blague nulle dans le salon principal.",
    "Écris un poème sur les lamas et partage-le.",
    "Change ton surnom pour quelque chose de ridicule choisi par les autres joueurs.",
    "Avoue un faux secret totalement absurde en faisant semblant d'être sérieux.",
    "Demande à quelqu'un du serveur de sortir avec toi (en précisant que c'est un gage)."
];

const TruthOrDareCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('action-verite')
        .setDescription('Joue à Action ou Vérité avec les membres du salon.'),

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

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('Action ou Vérité !')
            .setDescription(`${interaction.user.toString()} a lancé une partie ! Qui veut jouer ?`);
        
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('truth_or_dare_truth').setLabel('Vérité').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('truth_or_dare_dare').setLabel('Action').setStyle(ButtonStyle.Danger)
        );

        const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const collector = message.createMessageComponentCollector({ time: 600000 }); // 10 minutes

        collector.on('collect', async (i: MessageComponentInteraction) => {
            if (!i.isButton()) return;
            
            let title: string;
            let description: string;
            
            if (i.customId === 'truth_or_dare_truth') {
                title = '❓ Vérité';
                description = truths[Math.floor(Math.random() * truths.length)];
            } else {
                title = '🔥 Action';
                description = dares[Math.floor(Math.random() * dares.length)];
            }

            const gameEmbed = new EmbedBuilder()
                .setColor(i.customId === 'truth_or_dare_truth' ? 0x2ECC71 : 0xE74C3C)
                .setTitle(title)
                .setDescription(`${i.user.toString()}, voici ton choix :\n\n**${description}**`);
            
            await i.reply({ embeds: [gameEmbed] });
        });

        collector.on('end', () => {
            message.edit({ components: [] }).catch(() => {});
        });
    },
};

export default TruthOrDareCommand;
