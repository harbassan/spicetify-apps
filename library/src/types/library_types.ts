declare global {
    var SpicetifyLibrary: any; // Use a more specific type if you have one
}

export interface ConfigProps extends Record<string, any> {
    "card-size": number;
    "extended-search": boolean;
}

export interface ConfigWrapperProps {
    config: ConfigProps;
    launchModal: () => void;
}

// export interface InfoToCreatePlaylist {
//     playlistName: string;
//     itemsUris: string[];
// }
