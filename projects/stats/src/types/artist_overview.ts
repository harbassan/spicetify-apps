export interface ArtistOverviewResponse {
	data: { artistUnion: ArtistUnion };
}

export interface ArtistUnion {
	__typename: string;
	uri: string;
	id: string;
	profile: ArtistProfile;
	visuals: ArtistVisuals;
	stats: ArtistStats;
	discography: ArtistDiscography;
	relatedContent: RelatedContent;
}

export interface ArtistProfile {
	name: string;
	biography?: { text?: string };
	externalLinks?: { items: { name: string; url: string }[] };
}

export interface ArtistVisuals {
	avatarImage?: { sources: { url: string; width: number; height: number }[] };
	headerImage?: { sources: { url: string; width: number; height: number }[] };
}

export interface ArtistStats {
	monthlyListeners: number;
	followers: number;
	worldRank: number;
}

export interface ArtistDiscography {
	albums: DiscographySection;
	singles: DiscographySection;
	compilations: DiscographySection;
	topTracks: { items: ArtistTopTrack[] };
}

export interface DiscographySection {
	totalCount: number;
	items: DiscographyAlbum[];
}

export interface DiscographyAlbum {
	releases: {
		items: {
			id: string;
			uri: string;
			name: string;
			date: { year: number; isoString?: string };
			coverArt: { sources: { url: string }[] };
			type: string;
			tracks: { totalCount: number };
		}[];
	};
}

export interface ArtistTopTrack {
	uid: string;
	track: {
		uri: string;
		name: string;
		playcount: string;
		duration: { totalMilliseconds: number };
		album: {
			uri: string;
			name: string;
			coverArt: { sources: { url: string }[] };
		};
		// Some Spotify client versions use albumOfTrack instead of album
		albumOfTrack?: {
			uri: string;
			name: string;
			coverArt: { sources: { url: string }[] };
		};
		artists: { items: { uri: string; profile: { name: string } }[] };
	};
}

export interface RelatedContent {
	relatedArtists: {
		items: {
			uri: string;
			id: string;
			profile: { name: string };
			visuals: {
				avatarImage?: { sources: { url: string }[] };
			};
		}[];
	};
}

export interface PlaylistAppearance {
	uri: string;
	name: string;
	type: string;
	matchCount: number;
	imageUrl?: string;
}
