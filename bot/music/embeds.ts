import { EmbedBuilder } from 'discord.js';
import { Song } from './queue';

export function nowPlayingEmbed(song: Song, status: string): EmbedBuilder {
    const durationMinutes = Math.floor(song.duration / 60);
    const durationSeconds = song.duration % 60;
    const durationString = `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`;

    return new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(song.title)
        .setURL(song.url)
        .setAuthor({ name: status })
        .addFields(
            { name: 'Durée', value: durationString, inline: true },
            { name: 'Demandé par', value: song.requestedBy.toString(), inline: true }
        )
        .setTimestamp();
}
