
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, TextChannel, ThreadAutoArchiveDuration } from 'discord.js';
import type { Command, Persona } from '@/types';
import { getServerConfig, updatePersona } from '@/lib/db';
import { getOrCreatePrivateThread } from '../../events/agent/conversation';

const ConvMpCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('convmp')
        .setDescription("Ouvre une conversation privée avec l'agent IA du serveur."),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild || !interaction.member) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', ephemeral: true });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });

        const agentConfig = await getServerConfig(interaction.guild.id, 'conversational-agent');
        
        if (!agentConfig || !agentConfig.enabled) {
            await interaction.editReply({ content: "L'agent conversationnel est désactivé sur ce serveur."});
            return;
        }
        
        try {
            // We pass a "mock" persona object based on the agent's config
            const agentAsPersona: Persona = {
                id: interaction.guild.id, // Use guildId as a unique ID for the agent
                name: agentConfig.agent_name || "Agent",
                guild_id: interaction.guild.id,
                persona_prompt: '',
                creator_id: '',
                created_at: '',
                active_channel_id: null,
                avatar_url: null,
                role_id: null
            };

            const thread = await getOrCreatePrivateThread(interaction.guild, agentAsPersona, interaction.user);
            
            if(thread) {
                await interaction.editReply({ content: `Votre conversation privée avec **${agentAsPersona.name}** est prête ici : ${thread.toString()}` });
            } else {
                 await interaction.editReply({ content: 'Impossible de créer ou trouver le salon de conversation privée.' });
            }
        } catch (error) {
            console.error('[ConvMP] Error creating private thread for agent:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de la création de la conversation privée.' });
        }
    },
};

export default ConvMpCommand;
