import {
    AudioPlayer,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
    VoiceConnection,
    VoiceConnectionStatus,
    entersState,
    NoSubscriberBehavior,
} from '@discordjs/voice';
import { ChatInputCommandInteraction, Client, Collection, GuildMember, TextBasedChannel } from 'discord.js';
import play from 'play-dl';
import { musicQueue } from './queue';
import { nowPlayingEmbed } from './embeds';

class MusicPlayer {
    private client!: Client;
    private players: Collection<string, AudioPlayer> = new Collection();
    private connections: Collection<string, VoiceConnection> = new Collection();

    public initialize(client: Client) {
        this.client = client;
        this.client.on('voiceStateUpdate', (oldState, newState) => {
            // Auto-disconnect if bot is alone in channel
            if (oldState.channelId && oldState.channel?.members.size === 1 && oldState.channel?.members.has(this.client.user!.id)) {
                this.stop(oldState.guild.id);
            }
        });
    }

    // petit helper pour replies (utilise flags si ephemeral demandé)
    private async sendReply(interaction: ChatInputCommandInteraction, content: string | { embeds: any[] }, ephemeral = false) {
        try {
            // Si on a déjà répondu (deferred), on édite sinon on Reply
            // Ici on essaye editReply d'abord pour rester compatible avec ton usage actuel
            if ('editReply' in interaction && interaction.replied) {
                await interaction.editReply(content as any);
            } else {
                // flags: 1 << 6 => EPHEMERAL
                const opts: any = typeof content === 'string' ? { content } : content;
                if (ephemeral) opts.flags = 1 << 6;
                await interaction.reply(opts);
            }
        } catch (err) {
            // fallback simple
            try {
                await interaction.reply(typeof content === 'string' ? { content: content as string } : content);
            } catch (_) {
                console.warn('Impossible d\'envoyer la reply (probablement déjà répondu).');
            }
        }
    }

    async play(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId || !interaction.channel || !(interaction.member instanceof GuildMember)) return;

        const query = interaction.options.getString('chanson', true);
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            await this.sendReply(interaction, 'Vous devez être dans un salon vocal pour jouer de la musique.');
            return;
        }

        let connection = this.connections.get(interaction.guildId);
        try {
            if (!connection || connection.state.status === VoiceConnectionStatus.Destroyed) {
                connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guildId,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });
                this.connections.set(interaction.guildId, connection);
                await entersState(connection, VoiceConnectionStatus.Ready, 30e3);
            }
        } catch (err) {
            console.error('[Music Player] Erreur création connexion vocale:', err);
            await this.sendReply(interaction, '❌ Impossible de rejoindre le salon vocal.');
            return;
        }

        const guildQueue = musicQueue.get(interaction.guildId);

        let searchResults;
        try {
            searchResults = await play.search(query, {
                limit: 1,
                // source peut être précisé si besoin: source: { youtube: "video" }
            });
        } catch (err) {
            console.error('[Music Player] Erreur search play-dl:', err);
            await this.sendReply(interaction, "❌ Erreur lors de la recherche.");
            return;
        }

        if (!searchResults || searchResults.length === 0) {
            await this.sendReply(interaction, "Je n'ai pas trouvé de vidéo YouTube pour cette recherche.");
            return;
        }

        const songInfo = searchResults[0];

        // On garde un fallback si id manquant
        const videoPageUrl = songInfo.id ? `https://www.youtube.com/watch?v=${songInfo.id}` : (songInfo.url ?? undefined);
        if (!videoPageUrl) {
            console.error('[Music Player] Aucun id/url retourné par play.search:', songInfo);
            await this.sendReply(interaction, "❌ Résultat de recherche invalide (pas d'ID ni d'URL).");
            return;
        }

        // Récupérer les détails complets (video_info) pour stream_from_info
        let videoInfo;
        try {
            videoInfo = await play.video_info(videoPageUrl);
        } catch (err) {
            console.error('[Music Player] play.video_info failed for', videoPageUrl, err);
            await this.sendReply(interaction, `❌ Impossible de récupérer les informations de la vidéo.`);
            return;
        }

        const song = {
            id: songInfo.id ?? videoInfo.video_details?.id ?? null,
            title: videoInfo.video_details?.title ?? songInfo.title ?? 'Titre inconnu',
            url: videoPageUrl, // page URL, utile pour affichage / debug
            duration: videoInfo.video_details?.durationInSec ?? songInfo.durationInSec ?? 0,
            requestedBy: interaction.user,
        };

        guildQueue.add(song);

        if (guildQueue.songs.length === 1) {
             await this.sendReply(interaction, { embeds: [nowPlayingEmbed(song, 'Joue maintenant')] } as any);
             // kick off playback (ne pas await, pour éviter blocage)
             this.playNext(interaction.guildId, interaction.channel);
        } else {
            await this.sendReply(interaction, `Ajouté à la file d'attente : **${song.title}**`);
        }
    }

    private async playNext(guildId: string, textChannel: TextBasedChannel) {
        const guildQueue = musicQueue.get(guildId);
        const song = guildQueue.getCurrentSong();

        if (!song) {
            this.stop(guildId);
            try { textChannel.send('File d\'attente terminée. Je me déconnecte.'); } catch {}
            return;
        }

        // sécurité
        if (!song.id && !song.url) {
            console.error(`[Music Player] Chanson invalide (pas d'id/url) pour la guilde ${guildId}:`, song);
            try { textChannel.send(`❌ Impossible de lire la chanson : ${song.title} (ID/URL manquante).`); } catch {}
            guildQueue.next();
            return this.playNext(guildId, textChannel);
        }

        try {
            // Récupérer video_info (de nouveau) pour la chanson courante
            const videoPageUrl = song.id ? `https://www.youtube.com/watch?v=${song.id}` : song.url!;
            const videoInfo = await play.video_info(videoPageUrl);

            // Utiliser stream_from_info (compatible dernières versions)
            const stream = await play.stream_from_info(videoInfo);

            // stream.stream est le Readable (ou stream.audio), stream.type est input type
            const resource = createAudioResource(stream.stream, {
                inputType: stream.type
            });

            let player = this.players.get(guildId);

            if (!player) {
                player = createAudioPlayer({
                    behaviors: {
                        noSubscriber: NoSubscriberBehavior.Pause,
                    },
                });
                this.players.set(guildId, player);

                player.on(AudioPlayerStatus.Idle, () => {
                    guildQueue.next();
                    this.playNext(guildId, textChannel);
                });
                player.on('error', error => {
                    console.error(`[Music Player Error] Guild: ${guildId}`, error);
                    guildQueue.next();
                    this.playNext(guildId, textChannel);
                });
            }

            const connection = this.connections.get(guildId);
            if (connection && connection.state.status === VoiceConnectionStatus.Ready) {
                connection.subscribe(player);
                player.play(resource);
            } else {
                console.error(`[Music Player] No connection found for guild ${guildId} to play next song.`);
                try { textChannel.send('❌ Impossible de jouer : pas de connexion vocale.'); } catch {}
            }
        } catch (error) {
            console.error(`Error streaming song ${song.url ?? song.id}:`, error);
            try { textChannel.send(`❌ Impossible de lire la chanson : ${song.title}`); } catch {}
            guildQueue.next();
            // protège contre boucle infinie si on a beaucoup d'erreurs immédiates
            setTimeout(() => this.playNext(guildId, textChannel), 250);
        }
    }

    async stop(guildId: string) {
        const connection = this.connections.get(guildId);
        const player = this.players.get(guildId);

        musicQueue.clear(guildId);

        if(player) {
            player.stop(true);
            this.players.delete(guildId);
        }

        if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
            connection.destroy();
            this.connections.delete(guildId);
        }
    }

    async skip(interaction: ChatInputCommandInteraction) {
         if (!interaction.guildId) return;
         const guildQueue = musicQueue.get(interaction.guildId);
         if(guildQueue.songs.length === 0) {
             await interaction.reply("La file d'attente est vide.");
             return;
         }

         const player = this.players.get(interaction.guildId);
         if(player) {
             player.stop(); // This triggers the 'idle' event, which plays the next song
             await interaction.reply("Chanson passée.");
         } else {
            await interaction.reply("Aucune musique n'est en cours de lecture.");
         }
    }

    async queue(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) return;
        const guildQueue = musicQueue.get(interaction.guildId);
        await interaction.reply(guildQueue.getFormattedQueue());
    }
}

export const musicPlayer = new MusicPlayer();
