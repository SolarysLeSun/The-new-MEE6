
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import fetch from 'node-fetch';

const API_URL = process.env.BOT_API_URL || 'http://localhost:3001/api';

interface ClusterStatus {
    id: number;
    status: string;
    cpu: number;
    memory: string;
}

const MyStatusCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('mystatus')
        .setDescription('Affiche le statut du shard/cluster actuel du bot.')
        .setDMPermission(true),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: true });

        const clusterId = process.env.NODE_APP_INSTANCE ?? 'N/A';
        const shardId = interaction.guild?.shardId ?? 'N/A';

        let statusMessage = `Vous êtes actuellement sur le shard #${shardId} (cluster ${clusterId}).\n\n`;

        try {
            const response = await fetch(`${API_URL}/system-status`);
            if (!response.ok) {
                throw new Error("Impossible de contacter l'API de statut.");
            }
            const clusters: ClusterStatus[] = await response.json();
            
            const onlineClusters = clusters.filter(c => c.status === 'online');
            const totalClusters = clusters.length;

            if (onlineClusters.length === totalClusters && totalClusters > 0) {
                statusMessage += `✅ Tous les ${totalClusters} clusters sont en ligne !`;
            } else {
                statusMessage += `⚠️ ${onlineClusters.length}/${totalClusters} clusters sont en ligne.`;
            }

        } catch (error: any) {
            statusMessage += `❌ Impossible de vérifier le statut des autres clusters. Raison : ${error.message}`;
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x00BFFF)
            .setTitle('Statut du Bot Marcus')
            .setDescription(statusMessage)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};

export default MyStatusCommand;
