export interface GetContentsResponse<T> {
	primaryFilter: string;
	passedFilterIds: string[];
	availableFilters: SelectedSortOrder[];
	selectedFilters: SelectedSortOrder[];
	availableSortOrders: SelectedSortOrder[];
	selectedSortOrder: SelectedSortOrder;
	limit: number;
	offset: number;
	items: T[];
	unfilteredTotalLength: number;
	totalLength: number;
	hasUnfilteredItems: boolean;
	hasTextFilter: boolean;
	reorderAllowed: boolean;
	openedFolderName: string;
	parentFolderUri: string;
	openedFolderIsPlayable: boolean;
}

export interface SelectedSortOrder {
	id: string;
	name: string;
}

export interface Item {
	uri: string;
	name: string;
	images?: Image[];
	pinned: boolean;
	addedAt: Date;
	lastPlayedAt: Date | null;
	canPin: number;
}

export interface ArtistItem extends Item {
	type: "artist";
}

export interface AlbumItem extends Item {
	type: "album";
	artists: Artist[];
	isPremiumOnly: boolean;
}

export interface PlaylistItem extends Item {
	type: "playlist";
	canReorder: boolean;
	isEmpty: boolean;
	owner: Owner;
	isOwnedBySelf: boolean;
	isLoading: boolean;
	canAddTo: boolean;
	isBooklist: boolean;
}

export interface FolderItem extends Item {
	type: "folder";
	rowId: string;
	canReorder: boolean;
	isEmpty: boolean;
	numberOfFolders: number;
	numberOfPlaylists: number;
	isFlattened: boolean;
}

export interface ShowItem extends Item {
	type: "show";
	publisher: string;
}

export interface Artist {
	type: "artist";
	name: string;
	uri: string;
}

export interface Image {
	url: string;
	width: number;
	height: number;
}

export interface Owner {
	type: "user";
	name: string;
	uri: string;
	id: string;
	username: string;
	images: Image[];
}
