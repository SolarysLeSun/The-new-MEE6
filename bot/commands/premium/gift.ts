
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, GuildMember } from 'discord.js';
import type { Command } from '@/types';

const GiftCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('gift')
        .setDescription('Vérifie votre statut de booster et les récompenses associées.'),

    async execute(interaction: ChatInputCommandInteraction) {
        const supportServerId = process.env.SUPPORT_SERVER_ID;
        if (!supportServerId) {
            await interaction.reply({ content: 'Le serveur de support n\'est pas configuré par l\'administrateur du bot.', flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const supportGuild = await interaction.client.guilds.fetch(supportServerId);
            const member = await supportGuild.members.fetch(interaction.user.id).catch(() => null);

            if (member && member.premiumSinceTimestamp) {
                const boostDuration = Date.now() - member.premiumSinceTimestamp;
                const boostDays = Math.floor(boostDuration / (1000 * 60 * 60 * 24));
                
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('Statut de Booster Actif')
                    .setDescription(`Merci de soutenir le projet en boostant notre serveur depuis **${boostDays} jour(s)** !`)
                    .addFields({ name: 'Récompense', value: 'Vous avez dû recevoir votre clé premium par message privé. Si ce n\'est pas le cas, ouvrez un ticket sur le serveur de support.' })
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });

            } else {
                 const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('Statut de Booster Inactif')
                    .setDescription(`Vous ne semblez pas booster activement notre serveur de support. Boostez le serveur pour obtenir des récompenses exclusives !`)
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('[GiftCommand] Error:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de la vérification de votre statut.' });
        }
    },
};

export default GiftCommand;
