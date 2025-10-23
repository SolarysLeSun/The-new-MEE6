
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, TextChannel, ThreadAutoArchiveDuration } from 'discord.js';
import type { Command, Persona } from '@/types';
import { getPersonasForGuild, updatePersona } from '@/lib/db';
import { getOrCreatePrivateThread } from '../../events/agent/personaInteraction';

const ConvMpCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('convmp')
        .setDescription('Ouvre une conversation privée avec un personnage IA du serveur.')
        .addUserOption(option =>
            option.setName('personnage')
                .setDescription('Le personnage avec qui vous voulez parler (doit avoir le rôle du personnage).')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild || !interaction.member) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', ephemeral: true });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('personnage', true);
        const personas = getPersonasForGuild(interaction.guild.id);
        const targetPersona = personas.find(p => p.role_id && targetUser.id === interaction.client.users.cache.find(u => u.username === p.name)?.id);

        if (!targetPersona) {
            await interaction.editReply({ content: "Personnage non trouvé ou invalide. Assurez-vous de mentionner un utilisateur qui est un personnage IA."});
            return;
        }
        
        try {
            const thread = await getOrCreatePrivateThread(interaction.guild, targetPersona, interaction.user);
            if(thread) {
                await interaction.editReply({ content: `Votre conversation privée avec **${targetPersona.name}** est prête ici : ${thread.toString()}` });
            } else {
                 await interaction.editReply({ content: 'Impossible de créer ou trouver le salon de conversation privée.' });
            }
        } catch (error) {
            console.error('[ConvMP] Error creating private thread:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de la création de la conversation privée.' });
        }
    },
};

export default ConvMpCommand;
