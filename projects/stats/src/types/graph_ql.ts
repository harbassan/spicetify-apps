export interface getAlbumResponse {
	data: Data;
	extensions: null;
}

export interface Data {
	albumUnion: AlbumUnion;
}

export interface AlbumUnion {
	__typename: string;
	copyright: Copyright;
	courtesyLine: string;
	date: AlbumUnionDate;
	label: string;
	name: string;
	playability: ItemPlayability;
	saved: boolean;
	sharingInfo: AlbumUnionSharingInfo;
	tracks: AlbumUnionTracks;
	type: Type;
	uri: string;
	artists: AlbumUnionArtists;
	coverArt: CoverArt;
	discs: Discs;
	releases: Releases;
	moreAlbumsByArtist: MoreAlbumsByArtist;
}

export interface AlbumUnionArtists {
	items: AlbumArtist[];
	totalCount: number;
}

export interface AlbumArtist {
	id: string;
	profile: Profile;
	sharingInfo: SharingInfo;
	uri: string;
	visuals: Visuals;
}

export interface Profile {
	name: string;
}

export interface SharingInfo {
	shareUrl: string;
}

export interface Visuals {
	avatarImage: AvatarImage;
}

export interface AvatarImage {
	sources: Source[];
}

export interface Source {
	height: number;
	url: string;
	width: number;
}

export interface Copyright {
	items: CopyrightItem[];
	totalCount: number;
}

export interface CopyrightItem {
	text: string;
	type: string;
}

export interface CoverArt {
	extractedColors: ExtractedColors;
	sources: Source[];
}

export interface ExtractedColors {
	colorDark: Color;
	colorLight: Color;
	colorRaw: Color;
}

export interface Color {
	hex: string;
}

export interface AlbumUnionDate {
	isoString: Date;
	precision: string;
}

export interface Discs {
	items: DiscsItem[];
	totalCount: number;
}

export interface DiscsItem {
	number: number;
	tracks: AssociatedVideosClass;
}

export interface AssociatedVideosClass {
	totalCount: number;
}

export interface MoreAlbumsByArtist {
	items: MoreAlbumsByArtistItem[];
}

export interface MoreAlbumsByArtistItem {
	discography: Discography;
}

export interface Discography {
	popularReleasesAlbums: PopularReleasesAlbums;
}

export interface PopularReleasesAlbums {
	items: PopularReleasesAlbumsItem[];
}

export interface PopularReleasesAlbumsItem {
	coverArt: AvatarImage;
	date: ItemDate;
	id: string;
	name: string;
	playability: ItemPlayability;
	sharingInfo: AlbumUnionSharingInfo;
	type: Type;
	uri: string;
}

export interface ItemDate {
	year: number;
}

export interface ItemPlayability {
	playable: boolean;
	reason: "PLAYABLE";
}

export interface AlbumUnionSharingInfo {
	shareId: string;
	shareUrl: string;
}

export enum Type {
	Album = "ALBUM",
	Single = "SINGLE",
}

export interface Releases {
	items: ReleasesItem[];
	totalCount: number;
}

export interface ReleasesItem {
	name: string;
	uri: string;
}

export interface AlbumUnionTracks {
	items: TracksItem[];
	totalCount: number;
}

export interface TracksItem {
	track: Track;
	uid: string;
}

export interface Track {
	artists: TrackArtists;
	associations: Associations;
	contentRating: ContentRating;
	discNumber: number;
	duration: Duration;
	name: string;
	playability: TrackPlayability;
	playcount: string;
	relinkingInformation: null;
	saved: boolean;
	trackNumber: number;
	uri: string;
}

export interface TrackArtists {
	items: TrackArtist[];
}

export interface TrackArtist {
	profile: Profile;
	uri: string;
}

export interface Associations {
	associatedVideos: AssociatedVideosClass;
}

export interface ContentRating {
	label: string;
}

export interface Duration {
	totalMilliseconds: number;
}

export interface TrackPlayability {
	playable: boolean;
}
