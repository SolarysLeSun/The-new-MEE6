
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

// Replicating module list to avoid cross-dependency issues
const navCategories = [
    {
        name: 'Général',
        items: [
            { label: 'Commandes Générales' },
            { label: 'Identité du Bot' },
            { label: 'Annonces' },
            { label: 'Assistant Communautaire' },
            { label: 'Suggestions' },
            { label: 'Traduction Auto' },
            { label: 'Niveaux & XP' },
            { label: 'Parrainage' },
        ]
    },
    {
        name: 'Modération',
        items: [
            { label: 'Bans & Kicks' },
            { label: 'Auto-Modération' },
            { label: 'Anti-AFK' },
            { label: 'Lock/Unlock' },
            { label: 'Logs' },
        ]
    },
    {
        name: 'Sécurité',
        items: [
            { label: 'Anti-Bot' },
            { label: 'Anti-Raid' },
            { label: 'Scanner de Liens IA' },
            { label: "Filtre d'Image IA" },
            { label: 'Captcha' },
            { label: 'Backup' },
            { label: 'Sécurité Avancée' },
            { label: 'Persistance des Rôles' },
        ]
    },
    {
        name: 'Automatisation',
        items: [
            { label: 'Commandes Personnalisées' },
            { label: 'Tickets' },
            { label: 'Événements & Calendrier' },
            { label: 'Accueil & Intégration' },
            { label: 'Salons de Statistiques' },
        ]
    },
     {
        name: 'Divertissement',
        items: [
            { label: 'Commandes Fun' },
            { label: 'Roue de la Fortune' },
            { label: "Création d'Amitié" },
        ]
    },
    {
        name: 'Vocaux',
        items: [
             { label: 'Contrôle manuel' },
             { label: 'IA Vocaux' },
             { label: 'Contrôle Vidéo' },
        ]
    },
     {
        name: 'Outils IA',
        items: [
            { label: 'Assistant Personnel IA' },
            { label: 'Server Builder IA' },
            { label: 'Assistant Modération IA' },
            { label: 'Créateur de Contenu IA' },
            { label: 'Agent Conversationnel' },
            { label: 'Commandes Spéciales' },
        ]
    },
    {
        name: 'Connecteurs',
        items: [
            { label: 'Intégrations' },
        ]
    },
    {
        name: 'Outils',
        items: [
            { label: 'Lecteur de Transcriptions' },
            { label: "Constructeur d'Embeds" },
            { label: 'Commandes Utilitaires' },
        ]
    }
];


const MarcusCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('marcus')
        .setDescription('Affiche la liste de toutes les commandes et modules disponibles.'),
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

            // This part is complex and error-prone, let's simplify by manually defining categories if needed
            // For now, we'll keep the dynamic approach but it could be a source of issues.
            let commandFilePath = '';
            try {
                commandFilePath = require.resolve(path.join(commandsPath, command.data.name.split(' ')[0]));
            } catch (e) {
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
            .setTitle('📜 Liste des Commandes & Modules de Marcus')
            .setDescription('Voici les commandes et modules que vous pouvez utiliser.')
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
        
        // --- Add Modules List ---
        let moduleText = '';
        for (const category of navCategories) {
            moduleText += `\n**${category.name}**\n`;
            moduleText += category.items.map(item => `• ${item.label}`).join('\n');
        }
        
        if (moduleText.length > 0) {
            helpEmbed.addFields({
                name: '🗂️ Modules Disponibles',
                value: 'Voici la liste de tous les modules configurables depuis le panel web :\n' + moduleText.substring(0, 1000)
            });
        }


        await interaction.editReply({ embeds: [helpEmbed] });
    },
};

export default MarcusCommand;
