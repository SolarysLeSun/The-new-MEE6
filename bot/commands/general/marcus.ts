
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Collection, PermissionFlagsBits } from 'discord.js';
import type { Command } from '../../../src/types';
import { getServerConfig, checkTesterStatus } from '../../../src/lib/db';
import * as fs from 'fs';
import * as path from 'path';

const OWNER_ID = '556529963877138442';

// Helper function to capitalize first letter
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const getCommandCategory = (filePath: string, commandsPath: string): string => {
    const relativePath = path.relative(commandsPath, filePath);
    const category = path.dirname(relativePath).split(path.sep)[0];
    return category || 'uncategorized';
};


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
        
        const ownerCommands = ['genpremium', 'givepremium', 'giverole', 'disableia', 'enableia', 'adminannounce', 'delegate', 'restart', 'panelmessage', 'status', 'devserver', 'devadminannounce'];
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

            // Find the file path from the client's command collection
            const commandFileName = interaction.client.commands.find(c => c.data.name === command.data.name);
            if (!commandFileName) continue;
            
            // This is a bit of a hack, but `require.resolve` will find the module if it's in node's cache
            // A more robust way might be to store file paths on the client.commands collection during load.
            // For now, let's rebuild the path logic more carefully.
            let commandFilePath = '';
            try {
                // This is a bit of a hack, but `require.resolve` will find the module if it's in node's cache
                commandFilePath = require.resolve(`../${command.data.name.split(' ')[0]}`);
            } catch (e) {
                 // Fallback for nested commands or different folder structures
                 const commandFiles = fs.readdirSync(commandsPath, { withFileTypes: true, recursive: true });
                 const foundFile = commandFiles.find(file => file.isFile() && file.name.startsWith(command.data.name) && (file.name.endsWith('.ts') || file.name.endsWith('.js')));
                 if (foundFile) {
                    commandFilePath = path.join(foundFile.path, foundFile.name);
                 } else {
                    console.warn(`[MarcusCmd] Could not resolve path for command: ${command.data.name}`);
                    continue;
                 }
            }
            
            const category = getCommandCategory(commandFilePath, commandsPath);

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
            .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() || undefined });

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
