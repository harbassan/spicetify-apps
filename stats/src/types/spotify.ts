// note: some fields are missing from the types as they are not relevant to the project

export enum SpotifyRange {
	Short = "short_term",
	Medium = "medium_term",
	Long = "long_term",
}

interface AudioFeatures {
	acousticness: number;
	danceability: number;
	energy: number;
	instrumentalness: number;
	key: number;
	liveness: number;
	loudness: number;
	mode: number;
	speechiness: number;
	tempo: number;
	time_signature: number;
	valence: number;
}

interface AudioFeaturesWrapper extends AudioFeatures {
	uri: string;
	id: string;
	analysis_url: string;
	duration_ms: number;
	track_href: string;
	type: "audio_features";
}

interface Image {
	url: string;
	height: number | null;
	width: number | null;
}

interface SimplifiedArtist {
	href: string;
	id: string;
	name: string;
	type: "artist";
	uri: string;
}

export interface Artist extends SimplifiedArtist {
	followers: {
		total: number;
	};
	genres: string[];
	images: Image[];
	popularity: number;
}

export interface SimplifiedAlbum {
	album_type: "album" | "single" | "compilation";
	total_tracks: number;
	href: string;
	id: string;
	images: Image[];
	name: string;
	release_date: string;
	release_date_precision: "year" | "month" | "day";
	type: "album";
	uri: string;
	artists: SimplifiedArtist[];
}

export interface Album extends SimplifiedAlbum {
	tracks: Items<SimplifiedTrack>;
	external_ids: {
		isrc: string;
		ean: string;
		upc: string;
	};
	genres: string[]; // this seems to be missing in the response
	label: string;
	popularity: number;
}

interface SimplifiedTrack {
	disc_number: number;
	duration_ms: number;
	explicit: boolean;
	href: string;
	id: string;
	name: string;
	track_number: number;
	type: "track";
	uri: string;
	is_local: boolean;
}

export interface Track extends SimplifiedTrack {
	album: SimplifiedAlbum;
	artists: Artist[];
	external_ids: {
		isrc: string;
		ean: string;
		upc: string;
	};
	popularity: number;
}

interface PlaylistSimplified {
	collaborative: boolean;
	description: string | null;
	external_urls: {
		spotify: string;
	};
	href: string;
	id: string;
	images: Image[];
	name: string;
	owner: User;
	public: boolean | null;
	snapshot_id: string;
	tracks: {
		href: string;
		total: number;
	};
	type: "playlist";
	uri: string;
}

interface Playlist extends PlaylistSimplified {
	followers: {
		href: string | null;
		total: number;
	};
	tracks: Items<PlaylistTrack>;
}

interface User {
	external_urls: {
		spotify: string;
	};
	followers: {
		href: string | null;
		total: number;
	};
	href: string;
	id: string;
	type: "user";
	uri: string;
}

interface Episode {
	type: "episode";
}

export interface PlaylistTrack {
	added_at: string;
	added_by: User;
	is_local: boolean;
	track: Track | Episode | null; // the track can be unavailable
}

interface Items<T> {
	href: string;
	limit: number;
	next: string | null;
	offset: number;
	previous: string | null;
	total: number;
	items: T[];
}

export interface SeveralTracksResponse {
	tracks: Track[];
}

export interface SeveralArtistsResponse {
	artists: Artist[];
}

export interface SeveralAlbumsResponse {
	albums: Album[];
}

export interface SeveralAudioFeaturesResponse {
	audio_features: (AudioFeaturesWrapper | null)[];
}

export interface SearchResponse {
	tracks: Items<Track>;
	artists: Items<Artist>;
	albums: Items<SimplifiedAlbum>;
	// and other irrelevant object types eg. playlists
}

export type TopArtistsResponse = Items<Artist>;

export type TopTracksResponse = Items<Track>;

export type UserPlaylistsResponse = Items<PlaylistSimplified>;

export type PlaylistResponse = Playlist;
