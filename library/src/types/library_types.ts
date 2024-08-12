import type CollectionsWrapper from "../extensions/collections_wrapper";

declare global {
	var SpicetifyLibrary: any;
	var CollectionsWrapper: CollectionsWrapper;
}

export interface Config {
	"card-size": number;
	"extended-search": boolean;
}

export interface ConfigWrapper {
	config: Config;
	launchModal: () => void;
}
