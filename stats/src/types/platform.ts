export interface PlaylistResponse {
	metadata: Metadata;
	contents: Contents;
}

export interface Contents {
	items: (ContentsTrack | ContentsEpisode)[];
	offset: number;
	limit: number;
	totalLength: number;
}

export interface ContentsTrack {
	uid: string;
	playIndex: null;
	addedAt: Date;
	addedBy: Owner;
	formatListAttributes: unknown;
	type: "track";
	uri: string;
	name: string;
	album: Album;
	artists: Artist[];
	discNumber: number;
	trackNumber: number;
	duration: {
		milliseconds: number;
	};
	isExplicit: boolean;
	isLocal: boolean;
	isPlayable: boolean;
	is19PlusOnly: boolean;
}

export interface ContentsEpisode {
	type: "episode";
}

export interface Owner {
	type: "user";
	uri: string;
	username: string;
	displayName: string;
	images: Image[];
}

export interface Image {
	url: string;
	label: Label;
}

export enum Label {
	Large = "large",
	Small = "small",
	Standard = "standard",
	Xlarge = "xlarge",
}

export interface Album {
	type: "album";
	uri: string;
	name: string;
	artist: Artist;
	images: Image[];
}

export interface Artist {
	type: "artist";
	uri: string;
	name: string;
}

export interface Metadata {
	type: string;
	uri: string;
	name: string;
	description: string;
	images: Image[];
	madeFor: null;
	owner: Owner;
	totalLength: number;
	unfilteredTotalLength: number;
	totalLikes: number;
	duration: MetadataDuration;
	isLoaded: boolean;
	isOwnedBySelf: boolean;
	isPublished: boolean;
	hasEpisodes: boolean;
	hasSpotifyTracks: boolean;
	hasSpotifyAudiobooks: boolean;
	canAdd: boolean;
	canRemove: boolean;
	canPlay: boolean;
	formatListData: null;
	canReportAnnotationAbuse: boolean;
	hasDateAdded: boolean;
	permissions: Permissions;
	collaborators: Collaborators;
}

export interface Collaborators {
	count: number;
	items: CollaboratorsItem[];
}

export interface CollaboratorsItem {
	isOwner: boolean;
	tracksAdded: number;
	user: Owner;
}

export interface MetadataDuration {
	milliseconds: number;
	isEstimate: boolean;
}

export interface Permissions {
	canView: boolean;
	canAdministratePermissions: boolean;
	canCancelMembership: boolean;
	isPrivate: boolean;
}
