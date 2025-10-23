

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
    StreamType,
} from '@discordjs/voice';
import { ChatInputCommandInteraction, Client, Collection, GuildMember, TextBasedChannel } from 'discord.js';
import ytdl from 'ytdl-core';
import { nowPlayingEmbed } from './embeds';
import { Song } from './queue';
import { Readable } from 'stream';

// Ensure opus is available
try {
    require('opusscript');
} catch (e) {
    console.warn("[Music Player] opusscript n'est pas installé. La lecture audio pourrait être instable. `npm install opusscript`");
}


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

        const url = interaction.options.getString('chanson', true);
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            await this.sendReply(interaction, 'Vous devez être dans un salon vocal pour jouer de la musique.', true);
            return;
        }

        if (!ytdl.validateURL(url)) {
             await this.sendReply(interaction, "Veuillez fournir une URL YouTube valide (ex: https://www.youtube.com/watch?v=...).", true);
             return;
        }
        
        await this.sendReply(interaction, `🎵 Chargement de la chanson...`);

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

        this.playSong(url, interaction.guildId, interaction.channel, interaction);
    }
    
    private async playSong(url: string, guildId: string, textChannel: TextBasedChannel, interaction?: ChatInputCommandInteraction) {
        try {
            const songInfo = await ytdl.getInfo(url);
            
            const song: Song = {
                title: songInfo.videoDetails.title,
                url: songInfo.videoDetails.video_url,
                duration: parseInt(songInfo.videoDetails.lengthSeconds),
                requestedBy: interaction!.user,
            };

            if (interaction) {
                await this.sendReply(interaction, { embeds: [nowPlayingEmbed(song, 'Joue maintenant')] });
            }

            const stream = ytdl(url, { 
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25, // 32MB
            });

            const resource = createAudioResource(stream, {
                inputType: StreamType.Opus, // Force Opus encoding
            });

            const player = createAudioPlayer({
                behaviors: { noSubscriber: NoSubscriberBehavior.Stop },
            });
            this.players.set(guildId, player);
            
            const connection = this.connections.get(guildId);
            if (connection) {
                connection.subscribe(player);
                player.play(resource);

                player.on(AudioPlayerStatus.Idle, () => {
                    textChannel.send('La lecture est terminée. Je me déconnecte.');
                    this.stop(guildId);
                });

                player.on('error', error => {
                    console.error(`[Music Player Error] Guild: ${guildId}`, error);
                     textChannel.send(`❌ Une erreur est survenue pendant la lecture.`);
                    this.stop(guildId);
                });
            }

        } catch (error) {
            console.error(`Error streaming url "${url}":`, error);
            if (interaction) {
                 await this.sendReply(interaction, { content: `❌ Je n'ai pas pu lire la vidéo depuis cette URL.` });
            } else {
                 textChannel.send(`❌ Je n'ai pas pu lire la vidéo depuis cette URL.`);
            }
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
