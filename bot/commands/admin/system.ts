
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import type { Command } from '@/types';
import { hasPermission } from '@/lib/db';
import { exec } from 'child_process';

const OWNER_ID = '556529963877138442';

const SystemCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('system')
        .setDescription('Gère le système du bot. (Accès restreint)')
        .setDMPermission(true)
        .addSubcommand(subcommand =>
            subcommand
                .setName('restart')
                .setDescription('Redémarre tous les processus du bot.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Affiche le statut des processus du bot (cluster PM2).')),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID && !hasPermission(interaction.user.id, 'system')) {
            await interaction.reply({ content: 'Cette commande est exclusivement réservée au propriétaire du bot ou aux utilisateurs autorisés.', flags: MessageFlags.Ephemeral });
            return;
        }

        const subcommand = interaction.options.getSubcommand();
        await interaction.deferReply({ ephemeral: true });

        if (subcommand === 'restart') {
            const embed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('Redémarrage en cours...')
                .setDescription('Le bot va maintenant redémarrer. Le redémarrage complet peut prendre une minute.\n\n**Note :** Le redémarrage automatique dépend du gestionnaire de processus (PM2) configuré pour le bot.');

            await interaction.editReply({ embeds: [embed] });

            console.log(`[System] Redémarrage initié par ${interaction.user.tag}.`);
            exec('pm2 restart bot', (error) => {
                if (error) {
                    console.error(`[System] Erreur lors du redémarrage via PM2:`, error);
                }
            });
        } else if (subcommand === 'status') {
            exec('pm2 jlist', (error, stdout, stderr) => {
                if (error) {
                    console.error(`[System] Erreur lors de l'exécution de pm2 jlist:`, error);
                    interaction.editReply({ content: "Impossible de récupérer le statut des processus." });
                    return;
                }
                if (stderr) {
                     console.error(`[System] Erreur stderr de pm2 jlist:`, stderr);
                     interaction.editReply({ content: "Erreur lors de la lecture du statut des processus." });
                    return;
                }

                try {
                    const processes = JSON.parse(stdout);
                    const botProcesses = processes.filter((p: any) => p.name === 'bot');

                    const embed = new EmbedBuilder()
                        .setColor(0x00BFFF)
                        .setTitle('Statut du Cluster de Bot Marcus')
                        .setTimestamp();
                    
                    if (botProcesses.length === 0) {
                        embed.setDescription("Aucun processus de bot n'est actuellement géré par PM2.");
                    } else {
                        botProcesses.forEach((proc: any) => {
                            const status = proc.pm2_env.status === 'online' ? '🟢 En ligne' : '🔴 Hors ligne';
                            const memory = (proc.monit.memory / 1024 / 1024).toFixed(1);
                            embed.addFields({
                                name: `Cluster #${proc.pm_id}`,
                                value: `**Statut :** ${status}\n**CPU :** ${proc.monit.cpu}%\n**Mémoire :** ${memory} Mo`,
                                inline: true
                            });
                        });
                    }
                    
                    interaction.editReply({ embeds: [embed] });

                } catch (parseError) {
                    console.error('[System] Erreur lors du parsing du JSON de pm2:', parseError);
                    interaction.editReply({ content: "Impossible de lire la sortie de la commande de statut." });
                }
            });
        }
    },
};

export default SystemCommand;
