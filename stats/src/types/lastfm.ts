export interface TopTracksResponse {
	toptracks: TopTracks;
}

export interface TopArtistsResponse {
	topartists: TopArtists;
}

export interface TopAlbumsResponse {
	topalbums: TopAlbums;
}

export interface ResponseAttr {
	user?: string;
	totalPages: string;
	page: string;
	perPage: string;
	total: string;
}

export interface TopTracks {
	track: Track[];
	"@attr": ResponseAttr;
}

export interface TopArtists {
	artist: Artist[];
	"@attr": ResponseAttr;
}

export interface TopAlbums {
	artist: Album[];
	"@attr": ResponseAttr;
}

export interface Track {
	streamable: Streamable;
	mbid: string;
	name: string;
	image: Image[];
	artist: ArtistSimplified;
	url: string;
	duration: string;
	"@attr": ItemAttr;
	playcount: string;
}

export interface ArtistSimplified {
	url: string;
	name: string;
	mbid: string;
}

export interface Artist extends ArtistSimplified {
	streamable: string;
	image: Image[];
	playcount: string;
	"@attr": ItemAttr;
}

export interface Album {
	artist: ArtistSimplified;
	image: Image[];
	mbid: string;
	url: string;
	playcount: string;
	"@attr": ItemAttr;
	name: string;
}

export interface ItemAttr {
	rank: string;
}

export interface Image {
	size: Size;
	"#text": string;
}

export enum Size {
	Extralarge = "extralarge",
	Large = "large",
	Medium = "medium",
	Small = "small",
}

export interface Streamable {
	fulltrack: string;
	"#text": string;
}

export interface ArtistChartResponse {
	artists: TopArtists;
}

export interface TrackChartResponse {
	tracks: TopTracks;
}
