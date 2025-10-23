import { Collection, User } from 'discord.js';
import { nowPlayingEmbed } from './embeds';

export interface Song {
    title: string;
    url: string;
    duration: number;
    requestedBy: User;
}

class GuildQueue {
    public songs: Song[] = [];
    private currentIndex = 0;

    add(song: Song) {
        this.songs.push(song);
    }

    next() {
        this.currentIndex++;
    }

    getCurrentSong(): Song | undefined {
        return this.songs[this.currentIndex];
    }
    
    getFormattedQueue(): string {
        if(this.songs.length === 0) {
            return "La file d'attente est vide.";
        }
        
        const currentSong = this.getCurrentSong();
        const upcomingSongs = this.songs.slice(this.currentIndex + 1);

        let queueString = `**Joue maintenant :**\n[${currentSong?.title}](${currentSong?.url})\n\n`;

        if (upcomingSongs.length > 0) {
            queueString += "**Prochaines chansons :**\n";
            queueString += upcomingSongs
                .slice(0, 10)
                .map((song, index) => `${this.currentIndex + index + 2}. ${song.title}`)
                .join('\n');
        }
        
        return queueString.substring(0, 2000);
    }

    clear() {
        this.songs = [];
        this.currentIndex = 0;
    }
}

class MusicQueue {
    private queues = new Collection<string, GuildQueue>();

    get(guildId: string): GuildQueue {
        if (!this.queues.has(guildId)) {
            this.queues.set(guildId, new GuildQueue());
        }
        return this.queues.get(guildId)!;
    }

    clear(guildId: string) {
        if (this.queues.has(guildId)) {
            this.queues.get(guildId)!.clear();
            this.queues.delete(guildId);
        }
    }
}

export const musicQueue = new MusicQueue();
