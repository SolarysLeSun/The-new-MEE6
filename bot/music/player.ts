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
import { musicQueue, Song } from './queue';
import { nowPlayingEmbed } from './embeds';

class MusicPlayer {
    private client!: Client;
    private players: Collection<string, AudioPlayer> = new Collection();
    private connections: Collection<string, VoiceConnection> = new Collection();

    public initialize(client: Client) {
        this.client = client;
        this.client.on('voiceStateUpdate', (oldState, newState) => {
            if (oldState.channelId && oldState.channel?.members.size === 1 && oldState.channel?.members.has(this.client.user!.id)) {
                this.stop(oldState.guild.id);
            }
        });
    }

    private async sendReply(interaction: ChatInputCommandInteraction, content: string | { embeds: any[] }, ephemeral = false) {
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply(content as any);
            } else {
                const opts: any = typeof content === 'string' ? { content } : content;
                if (ephemeral) opts.ephemeral = true;
                await interaction.reply(opts);
            }
        } catch (err) {
            console.warn('Impossible d\'envoyer la reply (probablement déjà répondu ou interaction expirée).', err);
        }
    }

    async play(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId || !interaction.channel || !(interaction.member instanceof GuildMember)) return;

        const query = interaction.options.getString('chanson', true);
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            await this.sendReply(interaction, 'Vous devez être dans un salon vocal pour jouer de la musique.', true);
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
            await this.sendReply(interaction, '❌ Impossible de rejoindre le salon vocal.', true);
            return;
        }

        const guildQueue = musicQueue.get(interaction.guildId);

        let searchResults;
        try {
            searchResults = await play.search(query, { limit: 1 });
        } catch (err) {
            console.error('[Music Player] Erreur search play-dl:', err);
            await this.sendReply(interaction, "❌ Erreur lors de la recherche.", true);
            return;
        }

        if (!searchResults || searchResults.length === 0) {
            await this.sendReply(interaction, "Je n'ai pas trouvé de vidéo YouTube pour cette recherche.", true);
            return;
        }

        const songInfo = searchResults[0];
        
        const song: Song = {
            id: songInfo.id!,
            title: songInfo.title || 'Titre inconnu',
            url: `https://www.youtube.com/watch?v=${songInfo.id}`,
            duration: songInfo.durationInSec,
            requestedBy: interaction.user,
        };

        guildQueue.add(song);

        if (guildQueue.songs.length === 1) {
             await this.sendReply(interaction, { embeds: [nowPlayingEmbed(song, 'Joue maintenant')] });
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

        try {
            const videoPageUrl = song.id ? `https://www.youtube.com/watch?v=${song.id}` : song.url!;

            if (play.validate(videoPageUrl) !== 'yt_video') {
                console.error(`[Music Player] URL invalide pour ${song.title}: ${videoPageUrl}`);
                textChannel.send(`❌ Impossible de lire la chanson : ${song.title} (URL invalide)`);
                guildQueue.next();
                return this.playNext(guildId, textChannel);
            }

            const stream = await play.stream(videoPageUrl);

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
                console.error(`[Music Player] No connection found for guild ${guildId}`);
                textChannel.send('❌ Impossible de jouer : pas de connexion vocale.');
            }
        } catch (error) {
            console.error(`Error streaming song ${song.url ?? song.id}:`, error);
            textChannel.send(`❌ Impossible de lire la chanson : ${song.title}`);
            guildQueue.next();
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
