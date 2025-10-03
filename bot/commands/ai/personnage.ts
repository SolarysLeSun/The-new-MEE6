
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig, getPersonasForGuild, updatePersona } from '@/lib/db';

const PersonnageCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('personnage')
        .setDescription('Gère les personnages IA sur le serveur.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('activer')
                .setDescription("Active un personnage dans le salon actuel.")
                .addStringOption(option => 
                    option.setName('nom')
                        .setDescription('Le nom du personnage à activer.')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('desactiver')
                .setDescription("Désactive le personnage actif dans ce salon.")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('liste')
                .setDescription("Affiche la liste de tous les personnages créés.")
        ),
    
    async autocomplete(interaction) {
        // Feature is disabled, no need for autocomplete
        await interaction.respond([]);
    },

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply({ 
            content: 'Le module "Personnages IA" est actuellement en cours de refonte et n\'est pas disponible. Il sera de retour bientôt avec des améliorations !', 
            flags: MessageFlags.Ephemeral 
        });
        return;
    },
};

export default PersonnageCommand;
