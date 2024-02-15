import CollectionWrapper from "../extensions/collections_wrapper";

declare global {
    var SpicetifyLibrary: { CollectionWrapper: CollectionWrapper };
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
