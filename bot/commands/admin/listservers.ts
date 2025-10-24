
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, AttachmentBuilder } from 'discord.js';
import type { Command } from '@/types';

const OWNER_ID = '556529963877138442';

const ListServersCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('listservers')
        .setDescription("Liste tous les serveurs où le bot est présent. (Propriétaire seulement)")
        .setDMPermission(true),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID) {
            await interaction.reply({ content: 'Cette commande est exclusivement réservée au propriétaire du bot.', flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const guilds = interaction.client.guilds.cache;
            let serverList = `Total de serveurs : ${guilds.size}\n\n`;

            const sortedGuilds = [...guilds.values()].sort((a, b) => b.memberCount - a.memberCount);

            for (const guild of sortedGuilds) {
                serverList += `Nom: ${guild.name}\n`;
                serverList += `ID: ${guild.id}\n`;
                serverList += `Membres: ${guild.memberCount}\n`;
                serverList += `------------------------------------\n`;
            }

            const attachment = new AttachmentBuilder(Buffer.from(serverList), { name: 'servers.txt' });

            const embed = new EmbedBuilder()
                .setColor(0x00BFFF)
                .setTitle('Liste des Serveurs')
                .setDescription(`Voici la liste complète des **${guilds.size}** serveurs où je me trouve. Le fichier est trié par nombre de membres décroissant.`)
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed], files: [attachment] });

        } catch (error) {
            console.error(`[ListServersCommand] Error:`, error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de la récupération de la liste des serveurs.' });
        }
    },
};

export default ListServersCommand;
