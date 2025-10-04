
import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, GuildMember } from 'discord.js';
import type { Command } from '@/types';
import { getServerConfig } from '@/lib/db';

const adjectives = ["Rapide", "Furieux", "Ancien", "Mystique", "Sombre", "Brillant", "Silencieux", "Vaillant", "Sage", "Sauvage"];
const nouns = ["Dragon", "Loup", "Phénix", "Spectre", "Gardien", "Chasseur", "Sorcier", "Prophète", "Titan", "Nomade"];

const RandomNicknameCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('randomnickname')
        .setDescription('Donne un surnom aléatoire à un ou plusieurs utilisateurs.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('L\'utilisateur à renommer. Si non spécifié, renomme tout le serveur.'))
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('Le nombre d\'utilisateurs à renommer (si aucun utilisateur n\'est spécifié).')),

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

        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('user');
        const count = interaction.options.getInteger('count');

        try {
            if (targetUser) {
                const member = await interaction.guild.members.fetch(targetUser.id);
                const newNickname = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
                await member.setNickname(newNickname, `Surnom aléatoire par ${interaction.user.tag}`);
                await interaction.editReply(`✅ Le surnom de ${member} a été changé en **${newNickname}**.`);
            } else {
                let members = await interaction.guild.members.fetch();
                let membersToRename = members.filter(m => !m.permissions.has(PermissionFlagsBits.Administrator) && !m.user.bot).map(m => m);
                
                if (count && count > 0) {
                    // Shuffle and pick 'count' members
                    membersToRename.sort(() => 0.5 - Math.random());
                    membersToRename = membersToRename.slice(0, count);
                }

                let renamedCount = 0;
                for (const member of membersToRename) {
                     const newNickname = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
                     await member.setNickname(newNickname, `Surnom aléatoire de masse par ${interaction.user.tag}`).catch(() => {});
                     renamedCount++;
                }
                 await interaction.editReply(`✅ ${renamedCount} membre(s) ont reçu un nouveau surnom aléatoire.`);
            }
        } catch (error) {
            console.error('[RandomNickname] Error:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors du changement de surnom. Je n\'ai peut-être pas les permissions nécessaires.' });
        }
    },
};

export default RandomNicknameCommand;
