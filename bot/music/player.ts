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
import { nowPlayingEmbed } from './embeds';
import { musicQueue, Song } from './queue';

class MusicPlayer {
    public client!: Client;
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

        // Stop any currently playing song in this guild
        if (this.players.has(interaction.guildId)) {
            this.stop(interaction.guildId);
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
            title: songInfo.title || 'Titre inconnu',
            url: `https://www.youtube.com/watch?v=${songInfo.id}`,
            duration: songInfo.durationInSec,
            requestedBy: interaction.user,
        };

        await this.sendReply(interaction, { embeds: [nowPlayingEmbed(song, 'Joue maintenant')] });
        this.playSong(song, interaction.guildId, interaction.channel);
    }
    
    private async playSong(song: Song, guildId: string, textChannel: TextBasedChannel) {
        try {
            const stream = await play.stream(song.url);
            const resource = createAudioResource(stream.stream, { inputType: stream.type });

            const player = createAudioPlayer({
                behaviors: { noSubscriber: NoSubscriberBehavior.Stop },
            });
            this.players.set(guildId, player);
            
            const connection = this.connections.get(guildId);
            if (connection) {
                connection.subscribe(player);
                player.play(resource);

                player.on(AudioPlayerStatus.Idle, () => {
                    this.stop(guildId);
                });

                player.on('error', error => {
                    console.error(`[Music Player Error] Guild: ${guildId}`, error);
                    this.stop(guildId);
                });
            }

        } catch (error) {
            console.error(`Error streaming song ${song.url}:`, error);
            textChannel.send(`❌ Impossible de lire la chanson : ${song.title}`);
            this.stop(guildId);
        }
    }

    async stop(guildId: string) {
        const player = this.players.get(guildId);
        if (player) {
            player.stop(true);
            this.players.delete(guildId);
        }

        const connection = this.connections.get(guildId);
        if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
            connection.destroy();
            this.connections.delete(guildId);
        }
    }
}

export const musicPlayer = new MusicPlayer();
