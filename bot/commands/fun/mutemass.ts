
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, ChannelType, VoiceChannel } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig } from '@/lib/db';

const MuteMassCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('mutemass')
        .setDescription('Rend tous les utilisateurs d\'un salon vocal muets.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Le salon vocal à rendre muet.')
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) {
            await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', flags: MessageFlags.Ephemeral });
            return;
        }

        const config = await getServerConfig(interaction.guild.id, 'fun-commands');
        if (!config?.enabled) {
            await interaction.reply({ content: "Le module de commandes fun est désactivé.", flags: MessageFlags.Ephemeral });
            return;
        }

        const channel = interaction.options.getChannel('channel', true) as VoiceChannel;

        await interaction.deferReply({ ephemeral: true });

        try {
            let mutedCount = 0;
            for (const member of channel.members.values()) {
                if (!member.permissions.has(PermissionFlagsBits.Administrator) && !member.user.bot) {
                    try {
                        await member.voice.setMute(true, `Mute de masse par ${interaction.user.tag}`);
                        mutedCount++;
                    } catch (err) {
                        console.warn(`[MuteMass] Impossible de rendre muet ${member.user.tag}:`, err);
                    }
                }
            }
            await interaction.editReply(`✅ ${mutedCount} membre(s) ont été rendus muets dans le salon ${channel}.`);
        } catch (error) {
            console.error('[MuteMass] Error:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de la tentative de rendre les membres muets.' });
        }
    },
};

export default MuteMassCommand;
