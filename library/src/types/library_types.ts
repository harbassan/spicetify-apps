declare global {
	var SpicetifyLibrary: any;
}

export interface Config {
	"card-size": number;
	"extended-search": boolean;
}

export interface ConfigWrapper {
	config: Config;
	launchModal: () => void;
}
