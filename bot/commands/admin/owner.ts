
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import * as fs from 'fs';
import * as path from 'path';

const ENV_PATH = path.resolve(process.cwd(), '.env');
const OWNER_ID = process.env.OWNER_ID || '556529963877138442'; // Fallback for safety

const OwnerCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('owner')
        .setDescription('Définit le propriétaire principal du bot. (Exécutable une seule fois)')
        .setDMPermission(true)
        .addUserOption(option => 
            option.setName('utilisateur')
                .setDescription('L\'utilisateur qui sera le propriétaire.')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID) {
            await interaction.reply({ content: 'Cette commande est réservée au propriétaire initial du bot.', flags: MessageFlags.Ephemeral });
            return;
        }

        const targetUser = interaction.options.getUser('utilisateur', true);

        try {
            // Lecture du fichier .env
            let envContent = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf-8') : '';
            
            if (envContent.includes('OWNER_ID')) {
                await interaction.reply({ content: 'L\'ID du propriétaire a déjà été défini et ne peut pas être modifié par une commande pour des raisons de sécurité.', flags: MessageFlags.Ephemeral });
                return;
            }

            // Ajout ou mise à jour de la variable
            envContent += `\nOWNER_ID="${targetUser.id}"\n`;
            
            // Écriture dans le fichier .env
            fs.writeFileSync(ENV_PATH, envContent);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('Propriétaire Défini')
                .setDescription(`**${targetUser.tag}** a été défini comme le propriétaire principal du bot. Un redémarrage est nécessaire pour appliquer ce changement.`)
                .setFooter({ text: 'Ce changement est permanent.' });
            
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

        } catch (error) {
            console.error('[OwnerCommand] Error updating .env file:', error);
            await interaction.reply({ content: 'Une erreur est survenue lors de la mise à jour du fichier de configuration.', flags: MessageFlags.Ephemeral });
        }
    },
};

export default OwnerCommand;
