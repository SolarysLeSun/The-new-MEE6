
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command, Module } from '@/types';
import { setModuleDisabled, getDisabledModules, getAllModuleNames } from '@/lib/db';

const OWNER_ID = process.env.OWNER_ID || '556529963877138442';

const ModuleCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('module')
        .setDescription('Gère l\'état d\'urgence des modules. (Propriétaire seulement)')
        .setDMPermission(true)
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Désactive un module en urgence.')
                .addStringOption(option =>
                    option.setName('module')
                        .setDescription('Le nom du module à désactiver.')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('La raison affichée sur le panel.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Réactive un module.')
                .addStringOption(option =>
                    option.setName('module')
                        .setDescription('Le nom du module à réactiver.')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Liste les modules actuellement désactivés en urgence.')),

    async autocomplete(interaction: ChatInputCommandInteraction) {
        const focusedValue = interaction.options.getFocused();
        const allModules = getAllModuleNames();
        const filtered = allModules.filter(module => module.startsWith(focusedValue));
        await interaction.respond(
            filtered.map(module => ({ name: module, value: module })),
        );
    },

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID) {
            await interaction.reply({ content: 'Cette commande est exclusivement réservée au propriétaire du bot.', flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        const moduleName = interaction.options.getString('module') as Module;

        try {
            switch (subcommand) {
                case 'disable': {
                    const reason = interaction.options.getString('reason', true);
                    setModuleDisabled(moduleName, true, reason);
                    await interaction.editReply(`🔴 Le module \`${moduleName}\` a été désactivé en urgence. Raison : "${reason}"`);
                    break;
                }
                
                case 'enable': {
                    setModuleDisabled(moduleName, false, null);
                    await interaction.editReply(`🟢 Le module \`${moduleName}\` a été réactivé.`);
                    break;
                }

                case 'list': {
                    const disabledModules = getDisabledModules();
                    if (Object.keys(disabledModules).length === 0) {
                        await interaction.editReply('Aucun module n\'est actuellement en arrêt d\'urgence.');
                        return;
                    }

                    const embed = new EmbedBuilder()
                        .setTitle('Modules en Arrêt d\'Urgence')
                        .setColor(0xFFA500);
                    
                    for (const [mod, data] of Object.entries(disabledModules)) {
                        embed.addFields({ name: `🔴 ${mod}`, value: `**Raison :** ${data.reason}` });
                    }
                    
                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
            }
        } catch (error) {
            console.error(`[ModuleCommand] Error executing subcommand ${subcommand}:`, error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de l\'exécution de cette commande.' });
        }
    },
};

export default ModuleCommand;
