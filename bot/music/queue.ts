import { User } from 'discord.js';

export interface Song {
    title: string;
    url: string;
    duration: number;
    requestedBy: User;
}

// The queue system is deprecated in favor of a single-song player for stability.
// This file is kept for type definitions.
