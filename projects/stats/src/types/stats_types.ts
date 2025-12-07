declare global {
	var SpicetifyStats: any;
}

export interface Config {
	"api-key": string | null;
	"lastfm-user": string | null;
	"use-lastfm": boolean;
	"show-artists": boolean;
	"show-tracks": boolean;
	"show-genres": boolean;
	"show-library": boolean;
	"show-charts": boolean;
}

export interface ConfigWrapper {
	config: Config;
	launchModal: () => void;
}

export interface InfoToCreatePlaylist {
	playlistName: string;
	itemsUris: string[];
}

export interface LastFMMinifiedArtist {
	name: string;
	playcount: number;
	uri: string;
	image: undefined;
	type: "lastfm";
}

export interface SpotifyMinifiedArtist {
	name: string;
	uri: string;
	id: string;
	image?: string;
	genres: string[];
	playcount?: number;
	type: "spotify";
}

export interface LastFMMinifiedAlbum extends LastFMMinifiedArtist {}
export interface SpotifyMinifiedAlbum extends Omit<SpotifyMinifiedArtist, "genres"> {}

export interface SpotifyMinifiedTrack {
	id: string;
	uri: string;
	name: string;
	duration_ms: number;
	popularity: number;
	playcount?: number;
	explicit: boolean;
	image?: string;
	artists: {
		name: string;
		uri: string;
	}[];
	album: {
		name: string;
		uri: string;
		release_date: string;
	};
	type: "spotify";
}

export interface LastFMMinifiedTrack {
	name: string;
	uri: string;
	playcount: number;
	duration_ms: number;
	artists: {
		name: string;
		uri: string;
	}[];
	type: "lastfm";
}
