
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Collection, PermissionFlagsBits } from 'discord.js';
import type { Command } from '../../../src/types';
import { getServerConfig, checkTesterStatus } from '../../../src/lib/db';
import * as fs from 'fs';
import * as path from 'path';

const OWNER_ID = '556529963877138442';

// Helper function to capitalize first letter
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const getCommandCategory = (command: Command, commandsPath: string): string => {
    const commandName = command.data.name.split(' ')[0];
    
    const findInCategory = (dir: string): string | null => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                const found = findInCategory(fullPath);
                if (found) return path.basename(dir);
            } else if (path.basename(file, '.ts') === commandName || path.basename(file, '.js') === commandName) {
                 return path.basename(dir);
            }
        }
        return null;
    }
    
    return findInCategory(commandsPath) || 'uncategorized';
}


const MarcusCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('marcus')
        .setDescription('Affiche la liste de toutes les commandes disponibles.'),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: true });

        if (!interaction.guildId || !interaction.member) {
            await interaction.editReply({ content: "Une erreur est survenue." });
            return;
        }

        const config = await getServerConfig(interaction.guildId, 'general-commands');
        if (!config?.command_enabled?.marcus) {
            await interaction.editReply({ content: "Cette commande est désactivée sur ce serveur." });
            return;
        }
        
        // --- Permission Check ---
        const isOwner = interaction.user.id === OWNER_ID;
        const testerStatus = checkTesterStatus(interaction.user.id, interaction.guildId);
        const isAdmin = (interaction.member.permissions as Readonly<PermissionFlagsBits>).has(PermissionFlagsBits.Administrator);
        
        // --- Command Filtering ---
        const allCommands = interaction.client.commands;
        const commandCategories = new Collection<string, Command[]>();
        
        const ownerCommands = ['genpremium', 'givepremium', 'giverole', 'disableia', 'enableia', 'adminannounce', 'delegate', 'restart', 'panelmessage', 'status'];
        const testerCommands = ['mp', 'webhook', 'tester'];
        
        const commandsPath = path.join(__dirname, '..');
        
        for (const command of allCommands.values()) {
            const commandName = command.data.name;

            // Always hide owner commands unless the user is the owner
            if (ownerCommands.includes(commandName) && !isOwner) {
                continue;
            }
            
            // Hide tester commands unless the user is a tester or owner
            if (testerCommands.includes(commandName) && !testerStatus.isTester && !isOwner) {
                continue;
            }

            // For regular users, only show general commands and commands they have explicit permission for.
            if (!isOwner && !isAdmin && !testerStatus.isTester) {
                const defaultPermissions = command.data.default_member_permissions;
                // If a command requires any permission by default, hide it from lambda users
                if (defaultPermissions && BigInt(defaultPermissions) !== BigInt(0)) {
                    continue;
                }
            }
            
            const category = getCommandCategory(command, commandsPath);
            if (!commandCategories.has(category)) {
                commandCategories.set(category, []);
            }
            commandCategories.get(category)?.push(command);
        }

        const helpEmbed = new EmbedBuilder()
            .setColor(0x00BFFF)
            .setTitle('📜 Liste des Commandes de Marcus')
            .setDescription('Voici les commandes que vous pouvez utiliser.')
            .setTimestamp()
            .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

        const sortedCategories = new Collection(Array.from(commandCategories.entries()).sort());

        for (const [category, commandList] of sortedCategories.entries()) {
            if (category !== 'uncategorized' && commandList.length > 0) {
                 const commandText = commandList
                    .map(cmd => `\`/${cmd.data.name}\`: ${cmd.data.description}`)
                    .join('\n');
                
                if (commandText.length > 0) {
                     helpEmbed.addFields({ name: `**${capitalize(category)}**`, value: commandText.substring(0, 1024) });
                }
            }
        }

        await interaction.editReply({ embeds: [helpEmbed] });
    },
};

export default MarcusCommand;
