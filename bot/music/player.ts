
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

    async play(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId || !interaction.channel || !(interaction.member instanceof GuildMember)) return;

        const query = interaction.options.getString('chanson', true);
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            await interaction.editReply('Vous devez être dans un salon vocal pour jouer de la musique.');
            return;
        }

        let connection = this.connections.get(interaction.guildId);
        if (!connection || connection.state.status === VoiceConnectionStatus.Destroyed) {
            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guildId,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });
            this.connections.set(interaction.guildId, connection);
            await entersState(connection, VoiceConnectionStatus.Ready, 30e3);
        }
        
        const guildQueue = musicQueue.get(interaction.guildId);
        
        const searchResults = await play.search(query, {
            limit: 1
        });

        if (!searchResults || searchResults.length === 0) {
            await interaction.editReply("Je n'ai pas trouvé de vidéo YouTube pour cette recherche.");
            return;
        }

        const songInfo = searchResults[0];

        // Fetch full video details to get a streamable URL
        const videoInfo = await play.video_info(`https://www.youtube.com/watch?v=${songInfo.id}`);

        const song = {
            title: videoInfo.video_details.title || 'Titre inconnu',
            url: videoInfo.video_details.url,
            duration: videoInfo.video_details.durationInSec,
            requestedBy: interaction.user,
        };

        guildQueue.add(song);

        if (guildQueue.songs.length === 1) {
             await interaction.editReply({ embeds: [nowPlayingEmbed(song, 'Joue maintenant')] });
             this.playNext(interaction.guildId, interaction.channel);
        } else {
            await interaction.editReply(`Ajouté à la file d'attente : **${song.title}**`);
        }
    }

    private async playNext(guildId: string, textChannel: TextBasedChannel) {
        const guildQueue = musicQueue.get(guildId);
        const song = guildQueue.getCurrentSong();

        if (!song) {
            this.stop(guildId);
            textChannel.send('File d\'attente terminée. Je me déconnecte.');
            return;
        }
        
        if (!song.url) {
            console.error(`[Music Player] URL manquante pour ${song.title}`, song);
            textChannel.send(`❌ Impossible de lire la chanson : ${song.title} (URL non trouvée).`);
            guildQueue.next();
            return this.playNext(guildId, textChannel);
        }

        try {
            const stream = await play.stream(song.url);
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
            }
        } catch (error) {
            console.error(`Error streaming song ${song.url}:`, error);
            textChannel.send(`❌ Impossible de lire la chanson : ${song.title}`);
            guildQueue.next();
            this.playNext(guildId, textChannel);
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
