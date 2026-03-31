interface SpicetifyStatsGlobal {
	ConfigWrapper: {
		Config: Config & Record<string, unknown>;
		launchModal: (callback?: (config: Config) => void) => void;
	};
}

declare global {
	var SpicetifyStats: SpicetifyStatsGlobal;
}

export interface Config {
	"oauth-client-id": string | null;
	"use-oauth": boolean;
	"oauth-callback": string | null;
	"oauth-disconnect": boolean;
	"api-key": string | null;
	"lastfm-user": string | null;
	"use-direct-fetch": boolean;
	"show-debug-console": boolean;
	"use-lastfm": boolean;
	"lastfm-only": boolean;
	"use-musicbrainz-genres": boolean;
	"show-artists": boolean;
	"show-tracks": boolean;
	"show-albums": boolean;
	"show-genres": boolean;
	"show-library": boolean;
	"show-charts": boolean;
	"auto-load-playlist-appearances": boolean;
	"auto-load-lastfm-top-tracks": boolean;
	"auto-load-user-top-tracks": boolean;
	"prefer-spotify-links": boolean;
	"show-artist-stats-button": boolean;
	"artist-stats-button-order": number;
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
	image?: string;
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
	image?: string;
	artists: {
		name: string;
		uri: string;
	}[];
	type: "lastfm";
}
