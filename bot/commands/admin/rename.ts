
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, GuildMember } from 'discord.js';
import type { Command } from '@/types';

const OWNER_ID = '556529963877138442';

const RenameCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('rename')
        .setDescription('Renomme un utilisateur spécifique. (Propriétaire seulement)')
        .setDMPermission(false)
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur à renommer.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('surnom')
                .setDescription('Le nouveau surnom à appliquer.')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID) {
            await interaction.reply({ content: 'Cette commande est exclusivement réservée au propriétaire du bot.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (!interaction.guild) {
             await interaction.reply({ content: 'Cette commande doit être utilisée dans un serveur.', flags: MessageFlags.Ephemeral });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('utilisateur', true);
        const newNickname = interaction.options.getString('surnom', true);

        if (newNickname.length > 32) {
            await interaction.editReply({ content: 'Le surnom ne peut pas dépasser 32 caractères.' });
            return;
        }

        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null) as GuildMember;

        if (!member) {
            await interaction.editReply({ content: "Impossible de trouver cet utilisateur sur le serveur." });
            return;
        }

        try {
            const oldNickname = member.displayName;
            await member.setNickname(newNickname, `Renommé par ${interaction.user.tag}`);
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setAuthor({ name: `Surnom modifié pour ${targetUser.tag}`, iconURL: targetUser.displayAvatarURL() || undefined })
                .setDescription(`Le surnom de ${member.toString()} a été changé.`)
                .addFields(
                    { name: 'Ancien Surnom', value: `\`${oldNickname}\``, inline: true },
                    { name: 'Nouveau Surnom', value: `\`${newNickname}\``, inline: true }
                );

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: "Je n'ai pas pu changer le surnom de cet utilisateur. Vérifiez que mon rôle est bien au-dessus du sien." });
        }
    },
};

export default RenameCommand;
