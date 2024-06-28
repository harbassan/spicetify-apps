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

interface Artist extends SimplifiedArtist {
	followers: {
		total: number;
	};
	genres: string[];
	images: Image[];
	popularity: number;
}

interface SimplifiedAlbum {
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

interface Album extends SimplifiedAlbum {
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
	artists: SimplifiedArtist[];
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

interface Track extends SimplifiedTrack {
	album: SimplifiedAlbum;
	artists: Artist[];
	external_ids: {
		isrc: string;
		ean: string;
		upc: string;
	};
	popularity: number;
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

type TopArtistsRes = Items<Artist>;
type TopTracksRes = Items<Track>;

type SeveralTracksRes = { tracks: Track[] };
type SeveralArtistsRes = { artists: Artist[] };
type SeveralAlbumsRes = { albums: Album[] };
type SeveralAudioFeaturesRes = { audio_features: AudioFeaturesWrapper[] };

interface SearchRes {
	tracks: Items<Track>;
	artists: Items<Artist>;
	albums: Items<SimplifiedAlbum>;
	// and other irrelevant object types eg. playlists
}
