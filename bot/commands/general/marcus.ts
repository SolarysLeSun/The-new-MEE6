
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Collection, PermissionFlagsBits } from 'discord.js';
import type { Command } from '../../../src/types';
import { getServerConfig, checkTesterStatus } from '../../../src/lib/db';
import * as fs from 'fs';
import * as path from 'path';

const OWNER_ID = '556529963877138442';

// Helper function to capitalize first letter
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const getCommandCategory = (commandName: string): string => {
    // Manually define categories to avoid filesystem access issues
    const categoryMap: { [key: string]: string } = {
        adminxp: 'admin',
        apiban: 'admin',
        botban: 'admin',
        delegate: 'admin',
        devadminannounce: 'admin',
        devserver: 'admin',
        listservers: 'admin',
        normalize: 'admin',
        ownerboost: 'admin',
        panelmessage: 'admin',
        'purge-roles': 'admin',
        rename: 'admin',
        restart: 'admin',
        status: 'admin',
        system: 'admin',
        xpadmin: 'admin',
        iacontent: 'ai',
        iacreateserv: 'ai',
        iadeleteserv: 'ai',
        iaeditserv: 'ai',
        iaresetserv: 'ai',
        faq: 'ai',
        ia: 'ai',
        addticket: 'automation',
        'event-create': 'automation',
        'event-list': 'automation',
        privateresum: 'automation',
        set: 'config',
        'avertir-pour-message': 'context',
        'bombarder-reactions': 'context',
        'expulser-vocal': 'context',
        'surnom-aleatoire': 'context',
        'traduire-message': 'context',
        'transformer-en-patchnote': 'context',
        'action-verite': 'fun',
        de: 'fun',
        gaypride: 'fun',
        mutemass: 'fun',
        oktban: 'fun',
        payer: 'fun',
        pileouface: 'fun',
        poutine: 'fun',
        randomnickname: 'fun',
        react: 'fun',
        reactbomb: 'fun',
        renameall: 'fun',
        roue: 'fun',
        slots: 'fun',
        adminannounce: 'general',
        announce: 'general',
        help: 'general',
        invite: 'general',
        level: 'general',
        login: 'general',
        marcus: 'general',
        marcusfaq: 'general',
        mystatus: 'general',
        nextupdate: 'general',
        ping: 'general',
        podium: 'general',
        profil: 'general',
        say: 'general',
        setsuggest: 'general',
        suggest: 'general',
        toplevel: 'general',
        topxp: 'general',
        traduire: 'general',
        webleaderboard: 'general',
        ban: 'moderation',
        clearwarns: 'moderation',
        kick: 'moderation',
        kickvoc: 'moderation',
        lastwarns: 'moderation',
        listwarns: 'moderation',
        lock: 'moderation',
        mute: 'moderation',
        unban: 'moderation',
        unlock: 'moderation',
        warn: 'moderation',
        decoall: 'premium',
        disableia: 'premium',
        enableia: 'premium',
        freepremium: 'premium',
        genpremium: 'premium',
        gift: 'premium',
        givepremium: 'premium',
        giverole: 'premium',
        histoire: 'premium',
        moveall: 'premium',
        mp: 'premium',
        premium: 'premium',
        tester: 'premium',
        webhook: 'premium',
        backup: 'security',
        apikey: 'utils',
        parrainage: 'utils',
        patchnote: 'utils',
        rappel: 'utils',
        save: 'utils',
        setprofil: 'utils',
        join: 'voice',
        leave: 'voice',
        parle: 'voice',
        play: 'voice',
        queue: 'voice',
        skip: 'voice',
        stop: 'voice',
        ticket: 'automation'
    };
    
    const cmdName = commandName.split(' ')[0].toLowerCase().replace(/\s/g, '-');
    return categoryMap[cmdName] || 'uncategorized';
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
        
        for (const command of allCommands.values()) {
            const commandName = command.data.name;

            if (ownerCommands.includes(commandName) && !isOwner) {
                continue;
            }
            
            if (testerCommands.includes(commandName) && !testerStatus.isTester && !isOwner) {
                continue;
            }

            if (!isOwner && !isAdmin && !testerStatus.isTester) {
                const defaultPermissions = command.data.default_member_permissions;
                if (defaultPermissions && BigInt(defaultPermissions) !== BigInt(0)) {
                    continue;
                }
            }

            const category = getCommandCategory(command.data.name);

            if (!commandCategories.has(category)) {
                commandCategories.set(category, []);
            }
            commandCategories.get(category)?.push(command);
        }

        const sortedCategories = new Collection(Array.from(commandCategories.entries()).sort());
        const embeds: EmbedBuilder[] = [];
        const MAX_EMBED_SIZE = 5000;
        
        let currentEmbed = new EmbedBuilder()
            .setColor(0x00BFFF)
            .setTitle('📜 Liste des Commandes de Marcus')
            .setDescription('Voici les commandes que vous pouvez utiliser.')
            .setTimestamp()
            .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() || undefined });
            
        let currentSize = JSON.stringify(currentEmbed.toJSON()).length;

        for (const [category, commandList] of sortedCategories.entries()) {
            if (category !== 'uncategorized' && commandList.length > 0) {
                 const commandText = commandList
                    .map(cmd => `\`/${cmd.data.name}\`: ${cmd.data.description}`)
                    .join('\n');
                
                const fieldName = `**${capitalize(category)}**`;
                const fieldText = commandText.substring(0, 1024);
                
                // Check if adding the new field would exceed the limit
                if (currentSize + fieldName.length + fieldText.length > MAX_EMBED_SIZE) {
                    embeds.push(currentEmbed); // Save the current embed
                    currentEmbed = new EmbedBuilder().setColor(0x00BFFF); // Start a new one
                    currentSize = JSON.stringify(currentEmbed.toJSON()).length;
                }
                
                currentEmbed.addFields({ name: fieldName, value: fieldText });
                currentSize += fieldName.length + fieldText.length;
            }
        }
        
        embeds.push(currentEmbed); // Add the last embed

        try {
            await interaction.editReply({ embeds: [embeds[0]] });
            if (embeds.length > 1) {
                for (let i = 1; i < embeds.length; i++) {
                    // Send subsequent embeds as new messages
                    await interaction.followUp({ embeds: [embeds[i]], ephemeral: true });
                }
            }
        } catch (error) {
            console.error('[MarcusCmd] Error sending embeds:', error);
            await interaction.editReply({ content: "Une erreur est survenue lors de l'affichage des commandes." });
        }
    },
};

export default MarcusCommand;

    