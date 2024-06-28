export interface TopTracksResponse {
	toptracks: TopTracks;
}

export interface TopArtistsResponse {
	topartists: TopArtists;
}

export interface TopAlbumsResponse {
	topalbums: TopAlbums;
}

export interface ArtistChartResponse {
	artists: TopArtists;
}

export interface TrackChartResponse {
	tracks: TopTracks;
}

interface ResponseAttr {
	user?: string;
	totalPages: string;
	page: string;
	perPage: string;
	total: string;
}

interface TopTracks {
	track: Track[];
	"@attr": ResponseAttr;
}

interface TopArtists {
	artist: Artist[];
	"@attr": ResponseAttr;
}

interface TopAlbums {
	album: Album[];
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

interface ArtistSimplified {
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

interface ItemAttr {
	rank: string;
}

interface Image {
	size: Size;
	"#text": string;
}

enum Size {
	Extralarge = "extralarge",
	Large = "large",
	Medium = "medium",
	Small = "small",
}

interface Streamable {
	fulltrack: string;
	"#text": string;
}
