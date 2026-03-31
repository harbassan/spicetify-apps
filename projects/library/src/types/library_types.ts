import type CollectionsWrapper from "../extensions/collections_wrapper";
import type FolderImageWrapper from "../extensions/folder_image_wrapper";

interface SpicetifyLibraryGlobal {
	ConfigWrapper: {
		Config: Config & Record<string, unknown>;
		launchModal: (callback?: (config: Config) => void) => void;
	};
}

declare global {
	var SpicetifyLibrary: SpicetifyLibraryGlobal;
	var CollectionsWrapper: CollectionsWrapper;
	var FolderImageWrapper: FolderImageWrapper;
}

export interface Config {
	"card-size": number;
	"extended-search": boolean;
	localAlbums: boolean;
	includeLikedSongs: boolean;
	includeLocalFiles: boolean;
	"show-artists": boolean;
	"show-albums": boolean;
	"show-playlists": boolean;
	"show-shows": boolean;
	"show-collections": boolean;
	"show-debug-console": boolean;
	"show-item-count": boolean;
	"artist-album-view": boolean;
}

export interface ConfigWrapper {
	config: Config;
	launchModal: () => void;
}
